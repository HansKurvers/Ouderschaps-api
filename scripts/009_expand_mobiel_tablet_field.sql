-- Migration 009: Expand mobiel_tablet field to support JSON device data
-- Purpose: Allow storing device-specific age restrictions as JSON
-- Example: {"smartphone":12,"tablet":10,"laptop":14}

USE [mediation-document-generator-db]
GO

PRINT 'Starting Migration 009: Expand mobiel_tablet field'
PRINT '======================================================'
GO

-- Check current field size
PRINT 'Current field definition:'
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'communicatie_afspraken'
  AND COLUMN_NAME = 'mobiel_tablet'
GO

-- Alter column to support larger JSON strings
PRINT ''
PRINT 'Expanding mobiel_tablet field from NVARCHAR(100) to NVARCHAR(500)...'
ALTER TABLE dbo.communicatie_afspraken
ALTER COLUMN mobiel_tablet NVARCHAR(500) NULL
GO

-- Verify the change
PRINT ''
PRINT 'New field definition:'
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'communicatie_afspraken'
  AND COLUMN_NAME = 'mobiel_tablet'
GO

-- Add comment about the migration (for documentation)
PRINT ''
PRINT 'Migration completed successfully!'
PRINT 'The mobiel_tablet field can now store JSON data like:'
PRINT '{"smartphone":12,"tablet":10,"smartwatch":8,"laptop":14}'
PRINT ''
PRINT 'Old values like "gezamenlijk", "vrij", "beperkt" are still valid'
PRINT 'but will need to be manually updated to the new format if needed.'
GO

PRINT '======================================================'
PRINT 'Migration 009 Complete'
GO
