/*
 * Migration: Add User Billing Profile Fields
 * Date: 2025-11-15
 * Purpose: Add customer billing information for Mollie invoicing and BTW handling
 */

-- Step 1: Add billing profile columns to gebruikers table
-- Note: bedrijfsnaam, btw_nummer, is_zakelijk already exist, so we only add new columns
ALTER TABLE dbo.gebruikers ADD
    -- Type klant (particulier of zakelijk) - we'll use existing is_zakelijk field
    klant_type VARCHAR(20) NULL CHECK (klant_type IN ('particulier', 'zakelijk')),

    -- Contact informatie
    telefoon NVARCHAR(20) NULL,

    -- Adresgegevens (verplicht voor facturatie)
    straat NVARCHAR(255) NULL,
    huisnummer NVARCHAR(10) NULL,
    postcode NVARCHAR(10) NULL,
    plaats NVARCHAR(100) NULL,
    land NVARCHAR(2) DEFAULT 'NL',

    -- Zakelijke gegevens (only kvk_nummer is new)
    kvk_nummer NVARCHAR(20) NULL,

    -- Profiel status tracking
    profiel_compleet BIT DEFAULT 0,
    profiel_ingevuld_op DATETIME NULL;

GO

-- Step 2: Create index for performance on profiel_compleet
CREATE INDEX IX_gebruikers_profiel_compleet ON dbo.gebruikers(profiel_compleet);

GO

-- Step 3: Update existing users to have profiel_compleet = 0
UPDATE dbo.gebruikers
SET profiel_compleet = 0
WHERE profiel_compleet IS NULL;

GO

-- Step 4: Verification query (uncomment to run)
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_NAME = 'gebruikers'
--   AND TABLE_SCHEMA = 'dbo'
--   AND COLUMN_NAME IN ('klant_type', 'telefoon', 'straat', 'huisnummer', 'postcode',
--                       'plaats', 'land', 'bedrijfsnaam', 'btw_nummer', 'kvk_nummer',
--                       'profiel_compleet', 'profiel_ingevuld_op')
-- ORDER BY ORDINAL_POSITION;

GO

PRINT 'Migration 004: User billing profile fields added successfully';
PRINT 'Columns added: klant_type, telefoon, straat, huisnummer, postcode, plaats, land';
PRINT 'Columns added: kvk_nummer, profiel_compleet, profiel_ingevuld_op';
PRINT 'Note: bedrijfsnaam, btw_nummer, is_zakelijk already existed';
PRINT 'Index created: IX_gebruikers_profiel_compleet';
