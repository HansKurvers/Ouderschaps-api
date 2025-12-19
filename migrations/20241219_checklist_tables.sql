-- =====================================================
-- MIGRATIE: Document Checklist Tabellen
-- Datum: 2024-12-19
-- =====================================================

-- =====================================================
-- 1. CHECKLIST TEMPLATES (herbruikbare sjablonen)
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[checklist_templates]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.checklist_templates (
        id INT IDENTITY(1,1) PRIMARY KEY,
        naam NVARCHAR(100) NOT NULL,
        beschrijving NVARCHAR(500),
        type NVARCHAR(50) NOT NULL,                  -- 'echtscheiding', 'ouderschapsplan', 'mediation', etc.
        actief BIT DEFAULT 1,
        is_systeem_template BIT DEFAULT 0,           -- Systeem templates kunnen niet worden verwijderd
        volgorde INT DEFAULT 0,
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        gewijzigd_op DATETIME DEFAULT GETDATE()
    );

    -- Index voor actieve templates
    CREATE INDEX IX_templates_actief ON dbo.checklist_templates(actief, type);

    PRINT 'Table checklist_templates created';
END
ELSE
    PRINT 'Table checklist_templates already exists';
GO

-- =====================================================
-- 2. TEMPLATE ITEMS (items binnen een template)
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[checklist_template_items]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.checklist_template_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        template_id INT NOT NULL,
        naam NVARCHAR(200) NOT NULL,
        beschrijving NVARCHAR(500),
        categorie_id INT,                            -- FK naar document_categorieen (optioneel)
        toegewezen_aan_type NVARCHAR(20) NOT NULL,   -- 'partij1', 'partij2', 'gezamenlijk'
        verplicht BIT DEFAULT 1,
        volgorde INT DEFAULT 0,
        aangemaakt_op DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_template_items_template FOREIGN KEY (template_id)
            REFERENCES dbo.checklist_templates(id) ON DELETE CASCADE,
        CONSTRAINT FK_template_items_categorie FOREIGN KEY (categorie_id)
            REFERENCES dbo.document_categorieen(id),
        CONSTRAINT CHK_toegewezen_type CHECK (toegewezen_aan_type IN ('partij1', 'partij2', 'gezamenlijk'))
    );

    -- Index voor template lookup
    CREATE INDEX IX_template_items_template ON dbo.checklist_template_items(template_id, volgorde);

    PRINT 'Table checklist_template_items created';
END
ELSE
    PRINT 'Table checklist_template_items already exists';
GO

-- =====================================================
-- 3. DOSSIER CHECKLISTS (checklist per dossier)
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[dossier_checklists]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.dossier_checklists (
        id INT IDENTITY(1,1) PRIMARY KEY,
        dossier_id INT NOT NULL,
        naam NVARCHAR(100) NOT NULL DEFAULT 'Benodigde documenten',
        template_id INT,                             -- Welke template is gebruikt (voor referentie)
        aangemaakt_door_gebruiker_id INT NOT NULL,
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        gewijzigd_op DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_dossier_checklists_dossier FOREIGN KEY (dossier_id)
            REFERENCES dbo.dossiers(id) ON DELETE CASCADE,
        CONSTRAINT FK_dossier_checklists_template FOREIGN KEY (template_id)
            REFERENCES dbo.checklist_templates(id),
        CONSTRAINT FK_dossier_checklists_gebruiker FOREIGN KEY (aangemaakt_door_gebruiker_id)
            REFERENCES dbo.gebruikers(id),
        -- Een checklist per dossier (voor nu)
        CONSTRAINT UQ_dossier_checklist UNIQUE (dossier_id)
    );

    PRINT 'Table dossier_checklists created';
END
ELSE
    PRINT 'Table dossier_checklists already exists';
GO

-- =====================================================
-- 4. DOSSIER CHECKLIST ITEMS (items per dossier)
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[dossier_checklist_items]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.dossier_checklist_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        checklist_id INT NOT NULL,
        naam NVARCHAR(200) NOT NULL,
        beschrijving NVARCHAR(500),
        categorie_id INT,                            -- FK naar document_categorieen

        -- Toewijzing
        toegewezen_aan_type NVARCHAR(20) NOT NULL,   -- 'partij1', 'partij2', 'gezamenlijk'
        toegewezen_aan_gast_id INT,                  -- Optioneel: specifieke gast

        -- Status
        verplicht BIT DEFAULT 1,
        volgorde INT DEFAULT 0,

        -- Afvinken
        status NVARCHAR(20) DEFAULT 'open',          -- 'open', 'afgevinkt', 'nvt'
        document_id INT,                             -- Gekoppeld document
        afgevinkt_op DATETIME,
        afgevinkt_door_gebruiker_id INT,
        afgevinkt_door_gast_id INT,
        notitie NVARCHAR(500),                       -- Optionele notitie bij afvinken

        -- Timestamps
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        gewijzigd_op DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_checklist_items_checklist FOREIGN KEY (checklist_id)
            REFERENCES dbo.dossier_checklists(id) ON DELETE CASCADE,
        CONSTRAINT FK_checklist_items_categorie FOREIGN KEY (categorie_id)
            REFERENCES dbo.document_categorieen(id),
        CONSTRAINT FK_checklist_items_document FOREIGN KEY (document_id)
            REFERENCES dbo.dossier_documenten(id),
        CONSTRAINT FK_checklist_items_gast FOREIGN KEY (toegewezen_aan_gast_id)
            REFERENCES dbo.dossier_gasten(id),
        CONSTRAINT FK_checklist_items_afvinker_user FOREIGN KEY (afgevinkt_door_gebruiker_id)
            REFERENCES dbo.gebruikers(id),
        CONSTRAINT FK_checklist_items_afvinker_gast FOREIGN KEY (afgevinkt_door_gast_id)
            REFERENCES dbo.dossier_gasten(id),
        CONSTRAINT CHK_item_toegewezen_type CHECK (toegewezen_aan_type IN ('partij1', 'partij2', 'gezamenlijk')),
        CONSTRAINT CHK_item_status CHECK (status IN ('open', 'afgevinkt', 'nvt'))
    );

    -- Indexes
    CREATE INDEX IX_checklist_items_checklist ON dbo.dossier_checklist_items(checklist_id, volgorde);
    CREATE INDEX IX_checklist_items_status ON dbo.dossier_checklist_items(checklist_id, status);
    CREATE INDEX IX_checklist_items_document ON dbo.dossier_checklist_items(document_id) WHERE document_id IS NOT NULL;

    PRINT 'Table dossier_checklist_items created';
END
ELSE
    PRINT 'Table dossier_checklist_items already exists';
GO

-- =====================================================
-- 5. SEED DATA: STANDAARD TEMPLATES
-- =====================================================

-- Template 1: Echtscheiding Basis
IF NOT EXISTS (SELECT 1 FROM dbo.checklist_templates WHERE naam = 'Echtscheiding Basis')
BEGIN
    INSERT INTO dbo.checklist_templates (naam, beschrijving, type, is_systeem_template, volgorde)
    VALUES ('Echtscheiding Basis', 'Standaard documenten voor een echtscheidingsprocedure', 'echtscheiding', 1, 1);

    DECLARE @template_echtscheiding INT = SCOPE_IDENTITY();

    -- Items voor Echtscheiding Basis
    INSERT INTO dbo.checklist_template_items (template_id, naam, beschrijving, categorie_id, toegewezen_aan_type, verplicht, volgorde)
    VALUES
        -- Partij 1
        (@template_echtscheiding, 'Identiteitsbewijs', 'Geldig paspoort of ID-kaart',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Identiteitsbewijs'), 'partij1', 1, 1),
        (@template_echtscheiding, 'Loonstrook (laatste 3 maanden)', 'Loonstroken van de afgelopen 3 maanden',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij1', 1, 2),
        (@template_echtscheiding, 'Jaaropgave', 'Jaaropgave van het laatste jaar',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij1', 1, 3),
        (@template_echtscheiding, 'Pensioenoverzicht', 'Recent pensioenoverzicht',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'partij1', 0, 4),

        -- Partij 2
        (@template_echtscheiding, 'Identiteitsbewijs', 'Geldig paspoort of ID-kaart',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Identiteitsbewijs'), 'partij2', 1, 5),
        (@template_echtscheiding, 'Loonstrook (laatste 3 maanden)', 'Loonstroken van de afgelopen 3 maanden',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij2', 1, 6),
        (@template_echtscheiding, 'Jaaropgave', 'Jaaropgave van het laatste jaar',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij2', 1, 7),
        (@template_echtscheiding, 'Pensioenoverzicht', 'Recent pensioenoverzicht',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'partij2', 0, 8),

        -- Gezamenlijk
        (@template_echtscheiding, 'Huwelijksakte', 'Kopie van de huwelijksakte',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Juridisch'), 'gezamenlijk', 1, 9),
        (@template_echtscheiding, 'WOZ-beschikking', 'Meest recente WOZ-beschikking van de woning',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Woning'), 'gezamenlijk', 1, 10),
        (@template_echtscheiding, 'Hypotheekakte', 'Hypotheekakte van de woning',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Woning'), 'gezamenlijk', 0, 11),
        (@template_echtscheiding, 'Bankafschriften gezamenlijke rekening', 'Afschriften van de afgelopen 3 maanden',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'gezamenlijk', 0, 12);

    PRINT 'Template Echtscheiding Basis created with items';
END
ELSE
    PRINT 'Template Echtscheiding Basis already exists';
GO

-- Template 2: Ouderschapsplan
IF NOT EXISTS (SELECT 1 FROM dbo.checklist_templates WHERE naam = 'Ouderschapsplan')
BEGIN
    INSERT INTO dbo.checklist_templates (naam, beschrijving, type, is_systeem_template, volgorde)
    VALUES ('Ouderschapsplan', 'Documenten voor het opstellen van een ouderschapsplan', 'ouderschapsplan', 1, 2);

    DECLARE @template_ouderschap INT = SCOPE_IDENTITY();

    INSERT INTO dbo.checklist_template_items (template_id, naam, beschrijving, categorie_id, toegewezen_aan_type, verplicht, volgorde)
    VALUES
        -- Partij 1
        (@template_ouderschap, 'Identiteitsbewijs', 'Geldig paspoort of ID-kaart',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Identiteitsbewijs'), 'partij1', 1, 1),
        (@template_ouderschap, 'Inkomensgegevens', 'Loonstrook of uitkeringsspecificatie',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij1', 1, 2),

        -- Partij 2
        (@template_ouderschap, 'Identiteitsbewijs', 'Geldig paspoort of ID-kaart',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Identiteitsbewijs'), 'partij2', 1, 3),
        (@template_ouderschap, 'Inkomensgegevens', 'Loonstrook of uitkeringsspecificatie',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij2', 1, 4),

        -- Gezamenlijk
        (@template_ouderschap, 'Geboorteakte kind(eren)', 'Geboorteakte van alle kinderen',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Kinderen'), 'gezamenlijk', 1, 5),
        (@template_ouderschap, 'Uittreksel BRP kinderen', 'Recent uittreksel uit de Basisregistratie Personen',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Kinderen'), 'gezamenlijk', 0, 6);

    PRINT 'Template Ouderschapsplan created with items';
END
ELSE
    PRINT 'Template Ouderschapsplan already exists';
GO

-- Template 3: Mediation Compleet
IF NOT EXISTS (SELECT 1 FROM dbo.checklist_templates WHERE naam = 'Mediation Compleet')
BEGIN
    INSERT INTO dbo.checklist_templates (naam, beschrijving, type, is_systeem_template, volgorde)
    VALUES ('Mediation Compleet', 'Uitgebreide documentenlijst voor volledige mediation', 'mediation', 1, 3);

    DECLARE @template_mediation INT = SCOPE_IDENTITY();

    INSERT INTO dbo.checklist_template_items (template_id, naam, beschrijving, categorie_id, toegewezen_aan_type, verplicht, volgorde)
    VALUES
        -- Partij 1
        (@template_mediation, 'Identiteitsbewijs', 'Geldig paspoort of ID-kaart',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Identiteitsbewijs'), 'partij1', 1, 1),
        (@template_mediation, 'Loonstroken (3 maanden)', 'Loonstroken van de afgelopen 3 maanden',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij1', 1, 2),
        (@template_mediation, 'Jaaropgave', 'Meest recente jaaropgave',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij1', 1, 3),
        (@template_mediation, 'Aangifte inkomstenbelasting', 'Aangifte van het laatste jaar',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'partij1', 0, 4),
        (@template_mediation, 'Pensioenoverzicht', 'Actueel pensioenoverzicht',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'partij1', 1, 5),

        -- Partij 2
        (@template_mediation, 'Identiteitsbewijs', 'Geldig paspoort of ID-kaart',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Identiteitsbewijs'), 'partij2', 1, 6),
        (@template_mediation, 'Loonstroken (3 maanden)', 'Loonstroken van de afgelopen 3 maanden',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij2', 1, 7),
        (@template_mediation, 'Jaaropgave', 'Meest recente jaaropgave',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Inkomen'), 'partij2', 1, 8),
        (@template_mediation, 'Aangifte inkomstenbelasting', 'Aangifte van het laatste jaar',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'partij2', 0, 9),
        (@template_mediation, 'Pensioenoverzicht', 'Actueel pensioenoverzicht',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'partij2', 1, 10),

        -- Gezamenlijk
        (@template_mediation, 'Huwelijksakte', 'Kopie van de huwelijksakte',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Juridisch'), 'gezamenlijk', 1, 11),
        (@template_mediation, 'Huwelijkse voorwaarden', 'Indien van toepassing',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Juridisch'), 'gezamenlijk', 0, 12),
        (@template_mediation, 'Geboorteaktes kinderen', 'Van alle minderjarige kinderen',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Kinderen'), 'gezamenlijk', 1, 13),
        (@template_mediation, 'WOZ-beschikking', 'Meest recente WOZ-beschikking',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Woning'), 'gezamenlijk', 1, 14),
        (@template_mediation, 'Hypotheekakte', 'Hypotheekakte van de woning',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Woning'), 'gezamenlijk', 1, 15),
        (@template_mediation, 'Hypotheekoverzicht', 'Recent overzicht van hypotheekverstrekker',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Woning'), 'gezamenlijk', 1, 16),
        (@template_mediation, 'Taxatierapport', 'Recent taxatierapport van de woning',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Woning'), 'gezamenlijk', 0, 17),
        (@template_mediation, 'Polissen levensverzekering', 'Alle lopende levensverzekeringen',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'gezamenlijk', 0, 18),
        (@template_mediation, 'Spaargeld overzicht', 'Overzicht van alle spaarrekeningen',
            (SELECT TOP 1 id FROM dbo.document_categorieen WHERE naam = 'Financieel'), 'gezamenlijk', 0, 19);

    PRINT 'Template Mediation Compleet created with items';
END
ELSE
    PRINT 'Template Mediation Compleet already exists';
GO

-- Verify templates zijn aangemaakt
SELECT t.naam AS template, COUNT(i.id) AS aantal_items
FROM dbo.checklist_templates t
LEFT JOIN dbo.checklist_template_items i ON t.id = i.template_id
GROUP BY t.id, t.naam
ORDER BY t.volgorde;
