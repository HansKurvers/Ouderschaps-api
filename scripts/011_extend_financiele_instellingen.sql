-- Migration: Extend pensioen_uitvoerders with categorie and geschikt_voor
-- Date: 2024-12-11
-- Purpose: Enable the table to be used for both pension providers and insurers

-- =====================================================
-- STAP 1: Add new columns
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.pensioen_uitvoerders') AND name = 'categorie')
BEGIN
    ALTER TABLE dbo.pensioen_uitvoerders
    ADD categorie NVARCHAR(50) NULL;
    PRINT 'Column categorie added';
END
ELSE
BEGIN
    PRINT 'Column categorie already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.pensioen_uitvoerders') AND name = 'geschikt_voor')
BEGIN
    ALTER TABLE dbo.pensioen_uitvoerders
    ADD geschikt_voor NVARCHAR(255) NULL;
    PRINT 'Column geschikt_voor added';
END
ELSE
BEGIN
    PRINT 'Column geschikt_voor already exists';
END
GO

-- =====================================================
-- STAP 2: Update existing records with categories
-- =====================================================

-- Update Pensioenfondsen
UPDATE dbo.pensioen_uitvoerders
SET categorie = 'Pensioen',
    geschikt_voor = 'pensioen'
WHERE type = 'Pensioenfonds' AND (categorie IS NULL OR geschikt_voor IS NULL);
PRINT 'Updated Pensioenfondsen';
GO

-- Update PPI
UPDATE dbo.pensioen_uitvoerders
SET categorie = 'Pensioen',
    geschikt_voor = 'pensioen'
WHERE type = 'PPI' AND (categorie IS NULL OR geschikt_voor IS NULL);
PRINT 'Updated PPI';
GO

-- Update existing Verzekeraars (they can do pension + life insurance)
UPDATE dbo.pensioen_uitvoerders
SET categorie = 'Levensverzekering',
    geschikt_voor = 'pensioen,lijfrente,kapitaalverzekering,orv'
WHERE type = 'Verzekeraar' AND (categorie IS NULL OR geschikt_voor IS NULL);
PRINT 'Updated Verzekeraars';
GO

-- Update "Anders" - geschikt voor alles
UPDATE dbo.pensioen_uitvoerders
SET categorie = NULL,
    geschikt_voor = 'pensioen,lijfrente,kapitaalverzekering,orv,uitvaart'
WHERE naam = 'Anders';
PRINT 'Updated Anders';
GO

-- =====================================================
-- STAP 3: Add levensverzekeraars (if not exist)
-- =====================================================

-- ABN AMRO Levensverzekering
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'ABN AMRO Levensverzekering')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('ABN AMRO Levensverzekering', 'Verzekeraar', 'Levensverzekering', 50, 'HANDMATIG', 'lijfrente,kapitaalverzekering,orv');
    PRINT 'Inserted: ABN AMRO Levensverzekering';
END
GO

-- FBTO
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'FBTO')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('FBTO', 'Verzekeraar', 'Levensverzekering', 50, 'HANDMATIG', 'lijfrente,kapitaalverzekering,orv');
    PRINT 'Inserted: FBTO';
END
GO

-- Interpolis
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Interpolis')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Interpolis', 'Verzekeraar', 'Levensverzekering', 50, 'HANDMATIG', 'lijfrente,kapitaalverzekering,orv');
    PRINT 'Inserted: Interpolis';
END
GO

-- OHRA
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'OHRA')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('OHRA', 'Verzekeraar', 'Levensverzekering', 50, 'HANDMATIG', 'lijfrente,kapitaalverzekering,orv');
    PRINT 'Inserted: OHRA';
END
GO

-- Legal & General
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Legal & General')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Legal & General', 'Verzekeraar', 'Levensverzekering', 50, 'HANDMATIG', 'lijfrente,kapitaalverzekering,orv');
    PRINT 'Inserted: Legal & General';
END
GO

-- Scildon
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Scildon')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Scildon', 'Verzekeraar', 'Levensverzekering', 50, 'HANDMATIG', 'lijfrente,kapitaalverzekering,orv');
    PRINT 'Inserted: Scildon';
END
GO

-- TAF (specializes in ORV)
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'TAF')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('TAF', 'Verzekeraar', 'Levensverzekering', 50, 'HANDMATIG', 'orv');
    PRINT 'Inserted: TAF';
END
GO

-- Lifetri
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Lifetri')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Lifetri', 'Verzekeraar', 'Levensverzekering', 50, 'HANDMATIG', 'lijfrente,kapitaalverzekering');
    PRINT 'Inserted: Lifetri';
END
GO

-- =====================================================
-- STAP 4: Add uitvaartverzekeraars
-- =====================================================

-- DELA
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'DELA')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('DELA', 'Verzekeraar', 'Uitvaartverzekering', 60, 'HANDMATIG', 'uitvaart');
    PRINT 'Inserted: DELA';
END
GO

-- Monuta
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Monuta')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Monuta', 'Verzekeraar', 'Uitvaartverzekering', 60, 'HANDMATIG', 'uitvaart');
    PRINT 'Inserted: Monuta';
END
GO

-- Yarden
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Yarden')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Yarden', 'Verzekeraar', 'Uitvaartverzekering', 60, 'HANDMATIG', 'uitvaart');
    PRINT 'Inserted: Yarden';
END
GO

-- Ardanta
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Ardanta')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Ardanta', 'Verzekeraar', 'Uitvaartverzekering', 60, 'HANDMATIG', 'uitvaart');
    PRINT 'Inserted: Ardanta';
END
GO

-- Nuvema
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Nuvema')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Nuvema', 'Verzekeraar', 'Uitvaartverzekering', 60, 'HANDMATIG', 'uitvaart');
    PRINT 'Inserted: Nuvema';
END
GO

-- Uitvaart Groep Nederland
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Uitvaart Groep Nederland')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Uitvaart Groep Nederland', 'Verzekeraar', 'Uitvaartverzekering', 60, 'HANDMATIG', 'uitvaart');
    PRINT 'Inserted: Uitvaart Groep Nederland';
END
GO

-- PC Hooft Uitvaartverzekeringen
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'PC Hooft Uitvaartverzekeringen')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('PC Hooft Uitvaartverzekeringen', 'Verzekeraar', 'Uitvaartverzekering', 60, 'HANDMATIG', 'uitvaart');
    PRINT 'Inserted: PC Hooft Uitvaartverzekeringen';
END
GO

-- =====================================================
-- STAP 5: Create index on geschikt_voor
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_pensioen_uitvoerders_geschikt_voor')
BEGIN
    CREATE INDEX IX_pensioen_uitvoerders_geschikt_voor ON dbo.pensioen_uitvoerders(geschikt_voor);
    PRINT 'Index IX_pensioen_uitvoerders_geschikt_voor created';
END
GO

-- =====================================================
-- STAP 6: Verification
-- =====================================================

-- Check verdeling per categorie
SELECT categorie, COUNT(*) as aantal
FROM dbo.pensioen_uitvoerders
WHERE is_actief = 1
GROUP BY categorie
ORDER BY categorie;

-- Check geschikt_voor verdeling
SELECT 'pensioen' as gebruik, COUNT(*) as aantal FROM dbo.pensioen_uitvoerders WHERE geschikt_voor LIKE '%pensioen%' AND is_actief = 1
UNION ALL
SELECT 'lijfrente', COUNT(*) FROM dbo.pensioen_uitvoerders WHERE geschikt_voor LIKE '%lijfrente%' AND is_actief = 1
UNION ALL
SELECT 'kapitaalverzekering', COUNT(*) FROM dbo.pensioen_uitvoerders WHERE geschikt_voor LIKE '%kapitaalverzekering%' AND is_actief = 1
UNION ALL
SELECT 'orv', COUNT(*) FROM dbo.pensioen_uitvoerders WHERE geschikt_voor LIKE '%orv%' AND is_actief = 1
UNION ALL
SELECT 'uitvaart', COUNT(*) FROM dbo.pensioen_uitvoerders WHERE geschikt_voor LIKE '%uitvaart%' AND is_actief = 1;

SELECT 'Total records:' as info, COUNT(*) as count FROM dbo.pensioen_uitvoerders WHERE is_actief = 1;
