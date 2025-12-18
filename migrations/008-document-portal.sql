-- Migration: Document Portal Tables
-- Purpose: Add tables for document management, guest invitations, and audit logging
-- Date: 2025-12-18

-- =====================================================
-- TABLE: document_categorieen
-- Document categories with metadata
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'document_categorieen' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.document_categorieen (
        id INT IDENTITY(1,1) PRIMARY KEY,
        naam NVARCHAR(100) NOT NULL,
        beschrijving NVARCHAR(255),
        icoon NVARCHAR(50),                          -- Tabler icon naam, bijv. 'IconFileText'
        toegestane_extensies NVARCHAR(255),          -- Comma-separated, bijv. 'pdf,jpg,png'
        max_bestandsgrootte_mb INT DEFAULT 25,
        volgorde INT DEFAULT 0,
        actief BIT DEFAULT 1,
        aangemaakt_op DATETIME DEFAULT GETDATE()
    );

    PRINT 'Created table dbo.document_categorieen';
END
ELSE
BEGIN
    PRINT 'Table dbo.document_categorieen already exists';
END
GO

-- Seed data for categories (only if table is empty)
IF NOT EXISTS (SELECT 1 FROM dbo.document_categorieen)
BEGIN
    INSERT INTO dbo.document_categorieen (naam, beschrijving, icoon, toegestane_extensies, volgorde) VALUES
    ('Identiteitsbewijs', 'Paspoort, ID-kaart, rijbewijs', 'IconId', 'pdf,jpg,jpeg,png', 1),
    ('Inkomen', 'Loonstroken, jaaropgaven, belastingaangiften', 'IconCash', 'pdf', 2),
    ('Woning', 'Taxatierapporten, hypotheekaktes, huurcontracten', 'IconHome', 'pdf', 3),
    ('Kinderen', 'Geboorteaktes, schoolrapporten, medische documenten', 'IconUsers', 'pdf,jpg,jpeg,png', 4),
    ('Juridisch', 'Convenanten, beschikkingen, advocaatcorrespondentie', 'IconScale', 'pdf,docx', 5),
    ('Financieel', 'Bankafschriften, pensioenopgaven, polissen', 'IconReportMoney', 'pdf', 6),
    ('Overig', 'Overige relevante documenten', 'IconFile', 'pdf,jpg,jpeg,png,docx', 99);

    PRINT 'Seeded document_categorieen with default categories';
END
ELSE
BEGIN
    PRINT 'document_categorieen already has data, skipping seed';
END
GO

-- =====================================================
-- TABLE: dossier_gasten
-- Guest invitations for document portal access
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'dossier_gasten' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.dossier_gasten (
        id INT IDENTITY(1,1) PRIMARY KEY,
        dossier_id INT NOT NULL,

        -- Gast identificatie
        email NVARCHAR(255) NOT NULL,
        naam NVARCHAR(255),

        -- Token voor toegang (hash opgeslagen, niet plain text)
        token_hash NVARCHAR(64) NOT NULL,            -- SHA-256 hash van token
        token_verloopt_op DATETIME NOT NULL,

        -- Rechten
        rechten NVARCHAR(50) DEFAULT 'upload_view',  -- 'upload', 'view', 'upload_view'

        -- Status
        uitgenodigd_door_gebruiker_id INT NOT NULL,
        uitnodiging_verzonden_op DATETIME,
        eerste_toegang_op DATETIME NULL,
        laatste_toegang_op DATETIME NULL,
        ingetrokken BIT DEFAULT 0,
        ingetrokken_op DATETIME NULL,

        -- Timestamps
        aangemaakt_op DATETIME DEFAULT GETDATE(),

        -- Constraints
        CONSTRAINT FK_gasten_dossier FOREIGN KEY (dossier_id) REFERENCES dbo.dossiers(id),
        CONSTRAINT FK_gasten_uitnodiger FOREIGN KEY (uitgenodigd_door_gebruiker_id) REFERENCES dbo.gebruikers(id),
        CONSTRAINT UQ_gast_dossier_email UNIQUE (dossier_id, email)
    );

    -- Index voor token lookup
    CREATE INDEX IX_gasten_token ON dbo.dossier_gasten(token_hash) WHERE ingetrokken = 0;

    PRINT 'Created table dbo.dossier_gasten with indexes';
END
ELSE
BEGIN
    PRINT 'Table dbo.dossier_gasten already exists';
END
GO

-- =====================================================
-- TABLE: dossier_documenten
-- Document metadata (files stored in Azure Blob Storage)
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'dossier_documenten' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.dossier_documenten (
        id INT IDENTITY(1,1) PRIMARY KEY,
        dossier_id INT NOT NULL,
        categorie_id INT NOT NULL,

        -- Blob storage referentie
        blob_container NVARCHAR(100) NOT NULL,       -- 'dossier-00001'
        blob_path NVARCHAR(500) NOT NULL,            -- 'identiteit/paspoort-partij1.pdf'

        -- Bestandsinfo
        originele_bestandsnaam NVARCHAR(255) NOT NULL,
        opgeslagen_bestandsnaam NVARCHAR(255) NOT NULL,  -- UUID + extensie
        bestandsgrootte BIGINT NOT NULL,
        mime_type NVARCHAR(100) NOT NULL,

        -- Audit info
        geupload_door_gebruiker_id INT NULL,         -- NULL als gast
        geupload_door_gast_id INT NULL,              -- Referentie naar dossier_gasten
        upload_ip NVARCHAR(45),                      -- IPv4 of IPv6

        -- Timestamps
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        verwijderd_op DATETIME NULL,                 -- Soft delete

        -- Constraints
        CONSTRAINT FK_documenten_dossier FOREIGN KEY (dossier_id) REFERENCES dbo.dossiers(id),
        CONSTRAINT FK_documenten_categorie FOREIGN KEY (categorie_id) REFERENCES dbo.document_categorieen(id),
        CONSTRAINT FK_documenten_gebruiker FOREIGN KEY (geupload_door_gebruiker_id) REFERENCES dbo.gebruikers(id),
        CONSTRAINT FK_documenten_gast FOREIGN KEY (geupload_door_gast_id) REFERENCES dbo.dossier_gasten(id),
        CONSTRAINT CHK_uploader CHECK (
            (geupload_door_gebruiker_id IS NOT NULL AND geupload_door_gast_id IS NULL) OR
            (geupload_door_gebruiker_id IS NULL AND geupload_door_gast_id IS NOT NULL)
        )
    );

    -- Indexes voor snelle lookups
    CREATE INDEX IX_documenten_dossier ON dbo.dossier_documenten(dossier_id) WHERE verwijderd_op IS NULL;
    CREATE INDEX IX_documenten_categorie ON dbo.dossier_documenten(categorie_id);

    PRINT 'Created table dbo.dossier_documenten with indexes';
END
ELSE
BEGIN
    PRINT 'Table dbo.dossier_documenten already exists';
END
GO

-- =====================================================
-- TABLE: document_audit_log
-- Security audit trail for document operations
-- =====================================================
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'document_audit_log' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE dbo.document_audit_log (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        dossier_id INT,
        document_id INT NULL,

        -- Wie
        gebruiker_id INT NULL,
        gast_id INT NULL,
        ip_adres NVARCHAR(45),
        user_agent NVARCHAR(500),

        -- Wat
        actie NVARCHAR(50) NOT NULL,                 -- 'upload', 'download', 'delete', 'view', 'access_denied'
        details NVARCHAR(MAX),                       -- JSON met extra info

        -- Wanneer
        tijdstip DATETIME DEFAULT GETDATE()
    );

    CREATE INDEX IX_audit_dossier ON dbo.document_audit_log(dossier_id, tijdstip DESC);
    CREATE INDEX IX_audit_actie ON dbo.document_audit_log(actie, tijdstip DESC);

    PRINT 'Created table dbo.document_audit_log with indexes';
END
ELSE
BEGIN
    PRINT 'Table dbo.document_audit_log already exists';
END
GO

PRINT 'Migration 008-document-portal completed successfully';
GO
