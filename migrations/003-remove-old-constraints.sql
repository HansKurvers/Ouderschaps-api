-- ===================================================================
-- Remove old UNIQUE constraints that block multiple NULLs
-- Created: 2025-11-14
-- Description: Drop remaining old-style UNIQUE constraints
-- ===================================================================

-- Drop old constraint on mollie_customer_id
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ__abonneme__0B6F8383CF4BC41F' AND object_id = OBJECT_ID('dbo.abonnementen'))
BEGIN
    ALTER TABLE dbo.abonnementen DROP CONSTRAINT UQ__abonneme__0B6F8383CF4BC41F;
    PRINT 'Dropped old UNIQUE constraint UQ__abonneme__0B6F8383CF4BC41F on mollie_customer_id';
END
ELSE
BEGIN
    PRINT 'Old constraint UQ__abonneme__0B6F8383CF4BC41F not found (may already be removed)';
END

-- Find and drop any other old-style UNIQUE constraints
DECLARE @sql NVARCHAR(MAX);

-- Drop constraints that don't have filters (old style)
SELECT @sql = STRING_AGG(
    'ALTER TABLE dbo.abonnementen DROP CONSTRAINT ' + QUOTENAME(i.name) + ';',
    CHAR(13) + CHAR(10)
)
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('dbo.abonnementen')
    AND i.is_unique = 1
    AND i.has_filter = 0
    AND i.is_primary_key = 0  -- Don't drop primary key
    AND i.name LIKE 'UQ%';    -- Only drop UNIQUE constraints

IF @sql IS NOT NULL
BEGIN
    PRINT 'Dropping old-style UNIQUE constraints:';
    PRINT @sql;
    EXEC sp_executesql @sql;
    PRINT 'Old constraints removed successfully!';
END
ELSE
BEGIN
    PRINT 'No old-style UNIQUE constraints found.';
END

-- Verify only filtered indexes remain
SELECT
    i.name AS ConstraintName,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName,
    i.has_filter AS HasFilter,
    i.filter_definition AS FilterDefinition
FROM sys.indexes i
INNER JOIN sys.index_columns ic
    ON i.object_id = ic.object_id
    AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('dbo.abonnementen')
    AND i.is_unique = 1
    AND i.is_primary_key = 0
ORDER BY i.name;

PRINT '';
PRINT 'Migration 003 completed successfully!';
