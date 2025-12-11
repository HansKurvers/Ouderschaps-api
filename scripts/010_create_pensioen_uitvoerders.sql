-- Migration: Create pensioen_uitvoerders table and seed data
-- Date: 2024-12-11

-- =====================================================
-- STAP 1: Create pensioen_uitvoerders table
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pensioen_uitvoerders')
BEGIN
    CREATE TABLE dbo.pensioen_uitvoerders (
        id INT IDENTITY(1,1) PRIMARY KEY,
        naam NVARCHAR(255) NOT NULL,
        type NVARCHAR(50) NOT NULL CHECK (type IN ('Pensioenfonds', 'PPI', 'Verzekeraar', 'Anders')),
        is_actief BIT DEFAULT 1,
        volgorde INT DEFAULT 100,
        bron NVARCHAR(50) DEFAULT 'HANDMATIG' CHECK (bron IN ('HANDMATIG', 'DNB_PWPNF', 'DNB_WFTPP', 'DNB_WFTVZ')),
        dnb_naam NVARCHAR(255) NULL,
        laatst_gesynchroniseerd DATETIME NULL,
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        gewijzigd_op DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_pensioen_uitvoerders_naam UNIQUE (naam)
    );

    PRINT 'Table pensioen_uitvoerders created successfully';
END
ELSE
BEGIN
    PRINT 'Table pensioen_uitvoerders already exists';
END
GO

-- =====================================================
-- STAP 2: Create indexes
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_pensioen_uitvoerders_type')
BEGIN
    CREATE INDEX IX_pensioen_uitvoerders_type ON dbo.pensioen_uitvoerders(type);
    PRINT 'Index IX_pensioen_uitvoerders_type created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_pensioen_uitvoerders_naam')
BEGIN
    CREATE INDEX IX_pensioen_uitvoerders_naam ON dbo.pensioen_uitvoerders(naam);
    PRINT 'Index IX_pensioen_uitvoerders_naam created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_pensioen_uitvoerders_is_actief')
BEGIN
    CREATE INDEX IX_pensioen_uitvoerders_is_actief ON dbo.pensioen_uitvoerders(is_actief);
    PRINT 'Index IX_pensioen_uitvoerders_is_actief created';
END
GO

-- =====================================================
-- STAP 3: Create sync_log table for DNB synchronization
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pensioen_uitvoerders_sync_log')
BEGIN
    CREATE TABLE dbo.pensioen_uitvoerders_sync_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sync_datum DATETIME DEFAULT GETDATE(),
        bron NVARCHAR(50) NOT NULL,
        records_toegevoegd INT DEFAULT 0,
        records_bijgewerkt INT DEFAULT 0,
        records_gedeactiveerd INT DEFAULT 0,
        status NVARCHAR(20) DEFAULT 'SUCCES' CHECK (status IN ('SUCCES', 'FOUT', 'WAARSCHUWING')),
        foutmelding NVARCHAR(MAX) NULL,
        duur_ms INT NULL
    );

    PRINT 'Table pensioen_uitvoerders_sync_log created successfully';
END
ELSE
BEGIN
    PRINT 'Table pensioen_uitvoerders_sync_log already exists';
END
GO

-- =====================================================
-- STAP 4: Insert seed data
-- =====================================================

-- "Anders" optie - altijd bovenaan (volgorde = 0)
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Anders')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, volgorde, bron) VALUES
    ('Anders', 'Anders', 0, 'HANDMATIG');
    PRINT 'Inserted: Anders';
END
GO

-- Grote bedrijfstakpensioenfondsen (meest voorkomend, volgorde = 10)
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'ABP')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, volgorde, bron) VALUES
    ('ABP', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('PFZW (Zorg en Welzijn)', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('PMT (Metaal en Techniek)', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('PME (Metalektro)', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('BPF Bouw', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('Pensioenfonds Detailhandel', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('Pensioenfonds Horeca en Catering', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('Pensioenfonds Vervoer', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('Pensioenfonds Zorgverzekeraars', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('StiPP (Uitzendbranche)', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('Pensioenfonds PGB', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('Pensioenfonds Levensmiddelen', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('Pensioenfonds Schoonmaak', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('BPL Pensioen (Landbouw)', 'Pensioenfonds', 10, 'HANDMATIG'),
    ('Pensioenfonds Grafische Bedrijven', 'Pensioenfonds', 10, 'HANDMATIG');
    PRINT 'Inserted: Grote bedrijfstakpensioenfondsen (15 records)';
END
GO

-- Pensioenverzekeraars (volgorde = 20)
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'a.s.r.')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, volgorde, bron) VALUES
    ('a.s.r.', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Aegon (nu onderdeel a.s.r.)', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Nationale-Nederlanden', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Achmea Pensioen', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Centraal Beheer', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Zwitserleven', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Athora Netherlands', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Allianz Nederland', 'Verzekeraar', 20, 'HANDMATIG'),
    ('De Goudse', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Onderlinge ''s-Gravenhage', 'Verzekeraar', 20, 'HANDMATIG'),
    ('Delta Lloyd (nu NN)', 'Verzekeraar', 20, 'HANDMATIG'),
    ('REAAL (nu Athora)', 'Verzekeraar', 20, 'HANDMATIG');
    PRINT 'Inserted: Pensioenverzekeraars (12 records)';
END
GO

-- Premiepensioeninstellingen (PPI, volgorde = 30)
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Brand New Day')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, volgorde, bron) VALUES
    ('Brand New Day', 'PPI', 30, 'HANDMATIG'),
    ('BeFrank', 'PPI', 30, 'HANDMATIG'),
    ('Centraal Beheer PPI', 'PPI', 30, 'HANDMATIG'),
    ('a.s.r. PPI', 'PPI', 30, 'HANDMATIG'),
    ('Zwitserleven PPI', 'PPI', 30, 'HANDMATIG'),
    ('LifeSight', 'PPI', 30, 'HANDMATIG'),
    ('Cappital', 'PPI', 30, 'HANDMATIG'),
    ('Nationale-Nederlanden PPI', 'PPI', 30, 'HANDMATIG');
    PRINT 'Inserted: Premiepensioeninstellingen PPI (8 records)';
END
GO

-- Bekende ondernemingspensioenfondsen (volgorde = 40)
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Shell Pensioenfonds')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, volgorde, bron) VALUES
    ('Shell Pensioenfonds', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('ING Pensioenfonds', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Philips Pensioenfonds', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('KLM Pensioenfonds', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds DSM', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds TNO', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds KPN', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds PostNL', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Spoorwegpensioenfonds', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds Rabobank', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('ABN AMRO Pensioenfonds', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds Ahold Delhaize', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds Hoogovens', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds AKZO Nobel', 'Pensioenfonds', 40, 'HANDMATIG'),
    ('Pensioenfonds Unilever', 'Pensioenfonds', 40, 'HANDMATIG');
    PRINT 'Inserted: Ondernemingspensioenfondsen (15 records)';
END
GO

-- =====================================================
-- STAP 5: Verification
-- =====================================================

SELECT type, COUNT(*) as aantal
FROM dbo.pensioen_uitvoerders
GROUP BY type
ORDER BY MIN(volgorde);

SELECT 'Total records:' as info, COUNT(*) as count FROM dbo.pensioen_uitvoerders;
