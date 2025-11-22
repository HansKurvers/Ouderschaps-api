-- Migration: Add new fields to communicatie_afspraken table
-- Date: 2025-11-22
-- Description: Adds villaPinedoKinderen and kinderenBetrokkenheid fields

-- Add kinderen_betrokkenheid field
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.communicatie_afspraken')
    AND name = 'kinderen_betrokkenheid'
)
BEGIN
    ALTER TABLE dbo.communicatie_afspraken
    ADD kinderen_betrokkenheid NVARCHAR(50) NULL;

    PRINT 'Added column: kinderen_betrokkenheid';
END
ELSE
BEGIN
    PRINT 'Column kinderen_betrokkenheid already exists';
END
GO

-- Add villa_pinedo_kinderen field
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.communicatie_afspraken')
    AND name = 'villa_pinedo_kinderen'
)
BEGIN
    ALTER TABLE dbo.communicatie_afspraken
    ADD villa_pinedo_kinderen NVARCHAR(10) NULL;

    PRINT 'Added column: villa_pinedo_kinderen';
END
ELSE
BEGIN
    PRINT 'Column villa_pinedo_kinderen already exists';
END
GO

-- Migrate existing villa_pinedo boolean data to villa_pinedo_kinderen string
-- Only if the old column exists and new column is empty
IF EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.communicatie_afspraken')
    AND name = 'villa_pinedo'
)
BEGIN
    -- Convert boolean to string: TRUE -> 'ja', FALSE -> 'nee', NULL -> NULL
    UPDATE dbo.communicatie_afspraken
    SET villa_pinedo_kinderen = CASE
        WHEN villa_pinedo = 1 THEN 'ja'
        WHEN villa_pinedo = 0 THEN 'nee'
        ELSE NULL
    END
    WHERE villa_pinedo_kinderen IS NULL;

    PRINT 'Migrated villa_pinedo boolean values to villa_pinedo_kinderen string values';
    PRINT 'Note: The old villa_pinedo column is kept for backwards compatibility';
    PRINT 'You can drop it manually later with: ALTER TABLE dbo.communicatie_afspraken DROP COLUMN villa_pinedo;';
END
GO

-- Verify the changes
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'communicatie_afspraken'
    AND TABLE_SCHEMA = 'dbo'
    AND COLUMN_NAME IN ('villa_pinedo', 'villa_pinedo_kinderen', 'kinderen_betrokkenheid')
ORDER BY COLUMN_NAME;
GO

PRINT 'Migration completed successfully';
GO
