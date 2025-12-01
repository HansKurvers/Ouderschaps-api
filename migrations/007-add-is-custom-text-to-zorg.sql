-- Migration: Add is_custom_text field to zorg table
-- Purpose: Track when a zorg regeling uses custom text instead of a template
-- Date: 2025-12-01

-- Add the is_custom_text column to the zorg table
IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.zorg')
    AND name = 'is_custom_text'
)
BEGIN
    ALTER TABLE dbo.zorg
    ADD is_custom_text BIT NOT NULL DEFAULT 0;

    PRINT 'Added is_custom_text column to dbo.zorg table';
END
ELSE
BEGIN
    PRINT 'Column is_custom_text already exists in dbo.zorg table';
END
GO
