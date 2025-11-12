-- =============================================
-- Migration: Add sort_order to regelingen_templates
-- Description: Add sort_order column to enable custom ordering of template cards
-- Date: 2025-11-01
-- =============================================

-- Step 1: Add sort_order column (nullable first)
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'regelingen_templates'
    AND COLUMN_NAME = 'sort_order'
)
BEGIN
    PRINT 'Adding sort_order column to regelingen_templates table...';
    ALTER TABLE dbo.regelingen_templates
    ADD sort_order INT NULL;
    PRINT 'Column added successfully.';
END
ELSE
BEGIN
    PRINT 'Column sort_order already exists, skipping addition.';
END
GO

-- Step 2: Set default values based on current alphabetical order
-- This preserves the current ordering behavior
PRINT 'Setting default sort_order values...';

WITH NumberedTemplates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY type, meervoud_kinderen
            ORDER BY template_naam
        ) as row_num
    FROM dbo.regelingen_templates
)
UPDATE t
SET t.sort_order = nt.row_num * 10  -- Use increments of 10 to allow future insertions between items
FROM dbo.regelingen_templates t
INNER JOIN NumberedTemplates nt ON t.id = nt.id
WHERE t.sort_order IS NULL;

PRINT 'Default sort_order values set.';
GO

-- Step 3: Make column NOT NULL (now that all rows have values)
IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'regelingen_templates'
    AND COLUMN_NAME = 'sort_order'
    AND IS_NULLABLE = 'YES'
)
BEGIN
    PRINT 'Making sort_order column NOT NULL...';
    ALTER TABLE dbo.regelingen_templates
    ALTER COLUMN sort_order INT NOT NULL;
    PRINT 'Column altered to NOT NULL successfully.';
END
ELSE
BEGIN
    PRINT 'Column sort_order already NOT NULL, skipping alteration.';
END
GO

-- Step 4: Create index for better query performance
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_regelingen_templates_sort'
    AND object_id = OBJECT_ID('dbo.regelingen_templates')
)
BEGIN
    PRINT 'Creating index IX_regelingen_templates_sort...';
    CREATE INDEX IX_regelingen_templates_sort
    ON dbo.regelingen_templates(type, meervoud_kinderen, sort_order);
    PRINT 'Index created successfully.';
END
ELSE
BEGIN
    PRINT 'Index IX_regelingen_templates_sort already exists, skipping creation.';
END
GO

-- Step 5: Verify migration
PRINT '';
PRINT '=== Migration Verification ===';
PRINT 'Checking regelingen_templates table structure...';

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
AND TABLE_NAME = 'regelingen_templates'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT 'Sample data with sort_order:';
SELECT TOP 10
    id,
    template_naam,
    type,
    meervoud_kinderen,
    sort_order
FROM dbo.regelingen_templates
ORDER BY type, meervoud_kinderen, sort_order;

PRINT '';
PRINT '=== Migration Complete ===';
PRINT 'You can now customize template order by updating the sort_order column.';
PRINT 'Example: UPDATE dbo.regelingen_templates SET sort_order = 5 WHERE id = 1;';
PRINT '';

GO
