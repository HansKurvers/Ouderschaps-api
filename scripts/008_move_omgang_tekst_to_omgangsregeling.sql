-- Migration: Create omgangsregeling table and move omgang_tekst_of_schema from communicatie_afspraken
-- Date: 2025-11-23
-- Description: Creates new omgangsregeling table to store visitation arrangement metadata
--              Moves omgang_tekst_of_schema from communicatie_afspraken to new table
--              Adds new omgang_beschrijving field for text descriptions

-- Step 1: Create omgangsregeling table
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'omgangsregeling'
)
BEGIN
    CREATE TABLE dbo.omgangsregeling (
        id INT IDENTITY(1,1) PRIMARY KEY,
        dossier_id INT NOT NULL,
        omgang_tekst_of_schema NVARCHAR(50) NULL,
        omgang_beschrijving NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_omgangsregeling_dossiers
            FOREIGN KEY (dossier_id)
            REFERENCES dbo.dossiers(id)
            ON DELETE CASCADE
    );

    PRINT 'Created table: dbo.omgangsregeling';

    -- Create index on dossier_id for faster lookups
    CREATE INDEX IX_omgangsregeling_dossier_id
        ON dbo.omgangsregeling(dossier_id);

    PRINT 'Created index: IX_omgangsregeling_dossier_id';
END
ELSE
BEGIN
    PRINT 'Table omgangsregeling already exists';

    -- Ensure columns exist if table was created by different means
    IF NOT EXISTS (
        SELECT * FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.omgangsregeling')
        AND name = 'omgang_tekst_of_schema'
    )
    BEGIN
        ALTER TABLE dbo.omgangsregeling
        ADD omgang_tekst_of_schema NVARCHAR(50) NULL;
        PRINT 'Added column: omgang_tekst_of_schema';
    END

    IF NOT EXISTS (
        SELECT * FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.omgangsregeling')
        AND name = 'omgang_beschrijving'
    )
    BEGIN
        ALTER TABLE dbo.omgangsregeling
        ADD omgang_beschrijving NVARCHAR(MAX) NULL;
        PRINT 'Added column: omgang_beschrijving';
    END
END
GO

-- Step 3: Migrate existing data from communicatie_afspraken to omgangsregeling
-- Only migrate if the old column exists in communicatie_afspraken
IF EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.communicatie_afspraken')
    AND name = 'omgang_tekst_of_schema'
)
BEGIN
    -- Update existing omgangsregeling records with data from communicatie_afspraken
    UPDATE o
    SET o.omgang_tekst_of_schema = c.omgang_tekst_of_schema
    FROM dbo.omgangsregeling o
    INNER JOIN dbo.communicatie_afspraken c ON o.dossier_id = c.dossier_id
    WHERE c.omgang_tekst_of_schema IS NOT NULL
    AND o.omgang_tekst_of_schema IS NULL;

    DECLARE @rowsUpdated INT = @@ROWCOUNT;
    PRINT 'Migrated ' + CAST(@rowsUpdated AS NVARCHAR(10)) + ' omgang_tekst_of_schema values from communicatie_afspraken to omgangsregeling';

    -- For dossiers that have communicatie_afspraken but no omgangsregeling record yet,
    -- create the omgangsregeling record with the migrated data
    INSERT INTO dbo.omgangsregeling (dossier_id, omgang_tekst_of_schema)
    SELECT c.dossier_id, c.omgang_tekst_of_schema
    FROM dbo.communicatie_afspraken c
    LEFT JOIN dbo.omgangsregeling o ON c.dossier_id = o.dossier_id
    WHERE c.omgang_tekst_of_schema IS NOT NULL
    AND o.id IS NULL;

    DECLARE @rowsInserted INT = @@ROWCOUNT;
    PRINT 'Created ' + CAST(@rowsInserted AS NVARCHAR(10)) + ' new omgangsregeling records with migrated data';
END
ELSE
BEGIN
    PRINT 'Column omgang_tekst_of_schema does not exist in communicatie_afspraken table (already migrated)';
END
GO

-- Step 4: Drop the old column from communicatie_afspraken table
-- Note: Only execute this after verifying the migration was successful
IF EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.communicatie_afspraken')
    AND name = 'omgang_tekst_of_schema'
)
BEGIN
    ALTER TABLE dbo.communicatie_afspraken
    DROP COLUMN omgang_tekst_of_schema;

    PRINT 'Dropped column: omgang_tekst_of_schema from communicatie_afspraken table';
END
ELSE
BEGIN
    PRINT 'Column omgang_tekst_of_schema already dropped from communicatie_afspraken table';
END
GO

-- Step 5: Verify the changes
PRINT '';
PRINT '=== Verification ===';
PRINT 'Columns in omgangsregeling table:';
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'omgangsregeling'
    AND TABLE_SCHEMA = 'dbo'
    AND COLUMN_NAME IN ('omgang_tekst_of_schema', 'omgang_beschrijving')
ORDER BY COLUMN_NAME;
GO

PRINT '';
PRINT 'Checking if omgang_tekst_of_schema still exists in communicatie_afspraken:';
SELECT
    COLUMN_NAME,
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'communicatie_afspraken'
    AND TABLE_SCHEMA = 'dbo'
    AND COLUMN_NAME = 'omgang_tekst_of_schema';
GO

PRINT '';
PRINT 'Migration completed successfully';
GO
