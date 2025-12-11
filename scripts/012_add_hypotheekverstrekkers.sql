-- Migration: Add hypotheekverstrekkers to pensioen_uitvoerders
-- Date: 2024-12-11
-- Purpose: Extend financiele instellingen with mortgage providers (banks and specialized lenders)

-- =====================================================
-- STAP 1: Update type constraint to allow Bank and Hypotheekverstrekker
-- =====================================================

-- First, check and drop existing constraint
DECLARE @constraintName NVARCHAR(128);
SELECT @constraintName = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE c.object_id = OBJECT_ID('dbo.pensioen_uitvoerders') AND c.name = 'type';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.pensioen_uitvoerders DROP CONSTRAINT ' + @constraintName);
    PRINT 'Dropped default constraint on type column';
END
GO

-- Drop check constraint if exists
DECLARE @checkConstraintName NVARCHAR(128);
SELECT @checkConstraintName = cc.name
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID('dbo.pensioen_uitvoerders')
  AND cc.definition LIKE '%type%';

IF @checkConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.pensioen_uitvoerders DROP CONSTRAINT ' + @checkConstraintName);
    PRINT 'Dropped check constraint on type column: ' + @checkConstraintName;
END
GO

-- Add new check constraint with extended types
ALTER TABLE dbo.pensioen_uitvoerders
ADD CONSTRAINT CK_pensioen_uitvoerders_type
CHECK (type IN ('Pensioenfonds', 'PPI', 'Verzekeraar', 'Bank', 'Hypotheekverstrekker', 'Anders'));
PRINT 'Added new type check constraint with Bank and Hypotheekverstrekker';
GO

-- =====================================================
-- STAP 2: Update "Anders" to include hypotheek
-- =====================================================

UPDATE dbo.pensioen_uitvoerders
SET geschikt_voor = 'pensioen,lijfrente,kapitaalverzekering,orv,uitvaart,hypotheek'
WHERE naam = 'Anders';
PRINT 'Updated Anders to include hypotheek';
GO

-- =====================================================
-- STAP 3: Add banks that provide mortgages
-- =====================================================

-- Rabobank
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Rabobank')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Rabobank', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Rabobank';
END
GO

-- ABN AMRO
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'ABN AMRO')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('ABN AMRO', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: ABN AMRO';
END
GO

-- ING
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'ING')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('ING', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: ING';
END
GO

-- SNS Bank
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'SNS Bank')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('SNS Bank', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: SNS Bank';
END
GO

-- ASN Bank
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'ASN Bank')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('ASN Bank', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: ASN Bank';
END
GO

-- RegioBank
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'RegioBank')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('RegioBank', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: RegioBank';
END
GO

-- Triodos Bank
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Triodos Bank')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Triodos Bank', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Triodos Bank';
END
GO

-- NIBC
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'NIBC')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('NIBC', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: NIBC';
END
GO

-- Knab
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Knab')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Knab', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Knab';
END
GO

-- Bunq
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Bunq')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Bunq', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Bunq';
END
GO

-- Van Lanschot
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Van Lanschot')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Van Lanschot', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Van Lanschot';
END
GO

-- =====================================================
-- STAP 4: Add specialized hypotheekverstrekkers
-- =====================================================

-- Obvion
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Obvion')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Obvion', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Obvion';
END
GO

-- Florius
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Florius')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Florius', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Florius';
END
GO

-- De Hypotheker
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'De Hypotheker')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('De Hypotheker', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: De Hypotheker';
END
GO

-- Hypotrust
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Hypotrust')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Hypotrust', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Hypotrust';
END
GO

-- Vista Hypotheken
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Vista Hypotheken')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Vista Hypotheken', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Vista Hypotheken';
END
GO

-- Argenta
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Argenta')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Argenta', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Argenta';
END
GO

-- Lot Hypotheken
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Lot Hypotheken')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Lot Hypotheken', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Lot Hypotheken';
END
GO

-- Robuust
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Robuust')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Robuust', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Robuust';
END
GO

-- Tulp Hypotheken
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Tulp Hypotheken')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Tulp Hypotheken', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Tulp Hypotheken';
END
GO

-- MUNT Hypotheken
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'MUNT Hypotheken')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('MUNT Hypotheken', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: MUNT Hypotheken';
END
GO

-- Lloyds Bank
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Lloyds Bank')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Lloyds Bank', 'Bank', 'Hypotheek', 30, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Lloyds Bank';
END
GO

-- BLG Wonen
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'BLG Wonen')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('BLG Wonen', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: BLG Wonen';
END
GO

-- Venn Hypotheken
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Venn Hypotheken')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Venn Hypotheken', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Venn Hypotheken';
END
GO

-- Woonfonds
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Woonfonds')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Woonfonds', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Woonfonds';
END
GO

-- Dynamiet Hypotheken
IF NOT EXISTS (SELECT 1 FROM dbo.pensioen_uitvoerders WHERE naam = 'Dynamiet Hypotheken')
BEGIN
    INSERT INTO dbo.pensioen_uitvoerders (naam, type, categorie, volgorde, bron, geschikt_voor)
    VALUES ('Dynamiet Hypotheken', 'Hypotheekverstrekker', 'Hypotheek', 40, 'HANDMATIG', 'hypotheek');
    PRINT 'Inserted: Dynamiet Hypotheken';
END
GO

-- =====================================================
-- STAP 5: Add verzekeraars that also provide mortgages
-- =====================================================

-- Update existing Aegon to also include hypotheek
UPDATE dbo.pensioen_uitvoerders
SET geschikt_voor = CASE
    WHEN geschikt_voor IS NULL THEN 'hypotheek'
    WHEN geschikt_voor NOT LIKE '%hypotheek%' THEN geschikt_voor + ',hypotheek'
    ELSE geschikt_voor
END
WHERE naam = 'Aegon';
PRINT 'Updated Aegon with hypotheek';
GO

-- Update existing Nationale-Nederlanden to also include hypotheek
UPDATE dbo.pensioen_uitvoerders
SET geschikt_voor = CASE
    WHEN geschikt_voor IS NULL THEN 'hypotheek'
    WHEN geschikt_voor NOT LIKE '%hypotheek%' THEN geschikt_voor + ',hypotheek'
    ELSE geschikt_voor
END
WHERE naam = 'Nationale-Nederlanden';
PRINT 'Updated Nationale-Nederlanden with hypotheek';
GO

-- Update existing a.s.r. to also include hypotheek
UPDATE dbo.pensioen_uitvoerders
SET geschikt_voor = CASE
    WHEN geschikt_voor IS NULL THEN 'hypotheek'
    WHEN geschikt_voor NOT LIKE '%hypotheek%' THEN geschikt_voor + ',hypotheek'
    ELSE geschikt_voor
END
WHERE naam = 'a.s.r.';
PRINT 'Updated a.s.r. with hypotheek';
GO

-- Update existing Centraal Beheer to also include hypotheek
UPDATE dbo.pensioen_uitvoerders
SET geschikt_voor = CASE
    WHEN geschikt_voor IS NULL THEN 'hypotheek'
    WHEN geschikt_voor NOT LIKE '%hypotheek%' THEN geschikt_voor + ',hypotheek'
    ELSE geschikt_voor
END
WHERE naam = 'Centraal Beheer';
PRINT 'Updated Centraal Beheer with hypotheek';
GO

-- Update existing Allianz to also include hypotheek
UPDATE dbo.pensioen_uitvoerders
SET geschikt_voor = CASE
    WHEN geschikt_voor IS NULL THEN 'hypotheek'
    WHEN geschikt_voor NOT LIKE '%hypotheek%' THEN geschikt_voor + ',hypotheek'
    ELSE geschikt_voor
END
WHERE naam = 'Allianz';
PRINT 'Updated Allianz with hypotheek';
GO

-- Update existing Zwitserleven to also include hypotheek
UPDATE dbo.pensioen_uitvoerders
SET geschikt_voor = CASE
    WHEN geschikt_voor IS NULL THEN 'hypotheek'
    WHEN geschikt_voor NOT LIKE '%hypotheek%' THEN geschikt_voor + ',hypotheek'
    ELSE geschikt_voor
END
WHERE naam = 'Zwitserleven';
PRINT 'Updated Zwitserleven with hypotheek';
GO

-- Update existing Delta Lloyd (now NN) - just in case it exists separately
UPDATE dbo.pensioen_uitvoerders
SET geschikt_voor = CASE
    WHEN geschikt_voor IS NULL THEN 'hypotheek'
    WHEN geschikt_voor NOT LIKE '%hypotheek%' THEN geschikt_voor + ',hypotheek'
    ELSE geschikt_voor
END
WHERE naam LIKE '%Delta Lloyd%';
PRINT 'Updated Delta Lloyd with hypotheek';
GO

-- =====================================================
-- STAP 6: Verification
-- =====================================================

-- Check hypotheekverstrekkers
SELECT naam, type, categorie, geschikt_voor
FROM dbo.pensioen_uitvoerders
WHERE geschikt_voor LIKE '%hypotheek%' AND is_actief = 1
ORDER BY type, naam;

-- Count by type
SELECT type, COUNT(*) as aantal
FROM dbo.pensioen_uitvoerders
WHERE geschikt_voor LIKE '%hypotheek%' AND is_actief = 1
GROUP BY type
ORDER BY type;

SELECT 'Total hypotheekverstrekkers:' as info, COUNT(*) as count
FROM dbo.pensioen_uitvoerders
WHERE geschikt_voor LIKE '%hypotheek%' AND is_actief = 1;
