-- Migration: Add template_type column to dossiers table
-- Date: 2025-01-23
-- Description: Adds template_type column to store the selected document template per dossier

-- Add template_type column
ALTER TABLE dbo.dossiers
ADD template_type NVARCHAR(50) NULL;

-- Set default value for existing records
UPDATE dbo.dossiers
SET template_type = 'default'
WHERE template_type IS NULL;

-- Add default constraint for new records
ALTER TABLE dbo.dossiers
ADD CONSTRAINT DF_dossiers_template_type DEFAULT 'default' FOR template_type;

-- Add check constraint to ensure valid template types
ALTER TABLE dbo.dossiers
ADD CONSTRAINT CK_dossiers_template_type
CHECK (template_type IN ('default', 'v2'));

-- Optional: Add index for performance if we'll query by template_type frequently
-- CREATE INDEX IX_dossiers_template_type ON dbo.dossiers(template_type);

PRINT 'Migration 001_add_template_type_to_dossiers.sql completed successfully';
