-- =============================================
-- Migration: Add template_subtype to regelingen_templates and Vaderdag templates
-- Description: Add subtype column for special holiday templates and insert Vaderdag-specific templates
-- Date: 2025-11-12
-- =============================================

-- Step 1: Add template_subtype column (nullable first)
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'regelingen_templates'
    AND COLUMN_NAME = 'template_subtype'
)
BEGIN
    PRINT 'Adding template_subtype column to regelingen_templates table...';
    ALTER TABLE dbo.regelingen_templates
    ADD template_subtype NVARCHAR(50) NULL;
    PRINT 'Column added successfully.';
END
ELSE
BEGIN
    PRINT 'Column template_subtype already exists, skipping addition.';
END
GO

-- Step 2: Create index for better query performance on subtype
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_regelingen_templates_subtype'
    AND object_id = OBJECT_ID('dbo.regelingen_templates')
)
BEGIN
    PRINT 'Creating index IX_regelingen_templates_subtype...';
    CREATE INDEX IX_regelingen_templates_subtype
    ON dbo.regelingen_templates(type, template_subtype, meervoud_kinderen, sort_order);
    PRINT 'Index created successfully.';
END
ELSE
BEGIN
    PRINT 'Index IX_regelingen_templates_subtype already exists, skipping creation.';
END
GO

-- Step 3: Insert Vaderdag templates (enkelvoud)
PRINT '';
PRINT 'Inserting Vaderdag templates for enkelvoud...';

-- Check if Vaderdag templates already exist
IF NOT EXISTS (
    SELECT 1 FROM dbo.regelingen_templates 
    WHERE template_subtype = 'vaderdag'
)
BEGIN
    -- Get max sort_order for Feestdag type
    DECLARE @maxSortOrder INT;
    SELECT @maxSortOrder = ISNULL(MAX(sort_order), 0) FROM dbo.regelingen_templates WHERE type = 'Feestdag';

    -- Template 1: Kind is op Vaderdag bij vader
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_bij_vader',
        '{KIND} is op {FEESTDAG} bij {PARTIJ1}.',
        '{KIND} is op {FEESTDAG} bij {PARTIJ1}',
        0,
        'Feestdag',
        'vaderdag',
        @maxSortOrder + 10
    );

    -- Template 2: Kind is op Vaderdag en de avond voorafgaand bij vader
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_met_avond',
        '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}.',
        '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}',
        0,
        'Feestdag',
        'vaderdag',
        @maxSortOrder + 20
    );

    -- Template 3: Kind is in het weekend van Vaderdag bij vader
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_weekend',
        '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ1}.',
        '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ1}',
        0,
        'Feestdag',
        'vaderdag',
        @maxSortOrder + 30
    );

    -- Template 4: Kind krijgt gelegenheid om deel van de dag bij vader te zijn
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_deel_dag',
        '{KIND} krijgt de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ1} te zijn.',
        '{KIND} krijgt gelegenheid om deel van {FEESTDAG} bij {PARTIJ1} te zijn',
        0,
        'Feestdag',
        'vaderdag',
        @maxSortOrder + 40
    );

    -- Template 5: Op Vaderdag loopt de zorgregeling volgens schema
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_volgens_schema',
        'Op {FEESTDAG} loopt de zorgregeling volgens schema.',
        'Op {FEESTDAG} loopt de zorgregeling volgens schema',
        0,
        'Feestdag',
        'vaderdag',
        @maxSortOrder + 50
    );

    -- Template 6: Eigen tekst invoeren
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_eigen_tekst',
        'Eigen tekst invoeren',
        'Eigen tekst invoeren',
        0,
        'Feestdag',
        'vaderdag',
        @maxSortOrder + 60
    );

    PRINT 'Vaderdag templates (enkelvoud) inserted successfully.';
END
ELSE
BEGIN
    PRINT 'Vaderdag templates already exist, skipping insertion.';
END
GO

-- Step 4: Insert Vaderdag templates (meervoud)
PRINT '';
PRINT 'Inserting Vaderdag templates for meervoud...';

IF NOT EXISTS (
    SELECT 1 FROM dbo.regelingen_templates 
    WHERE template_subtype = 'vaderdag' AND meervoud_kinderen = 1
)
BEGIN
    -- Get max sort_order for Feestdag type
    DECLARE @maxSortOrderMeervoud INT;
    SELECT @maxSortOrderMeervoud = ISNULL(MAX(sort_order), 0) FROM dbo.regelingen_templates WHERE type = 'Feestdag';

    -- Template 1: Kinderen zijn op Vaderdag bij vader
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_bij_vader_meervoud',
        'De kinderen zijn op {FEESTDAG} bij {PARTIJ1}.',
        'De kinderen zijn op {FEESTDAG} bij {PARTIJ1}',
        1,
        'Feestdag',
        'vaderdag',
        @maxSortOrderMeervoud + 10
    );

    -- Template 2: Kinderen zijn op Vaderdag en de avond voorafgaand bij vader
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_met_avond_meervoud',
        'De kinderen zijn op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}.',
        'De kinderen zijn op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}',
        1,
        'Feestdag',
        'vaderdag',
        @maxSortOrderMeervoud + 20
    );

    -- Template 3: Kinderen zijn in het weekend van Vaderdag bij vader
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_weekend_meervoud',
        'De kinderen zijn in het weekend van {FEESTDAG} bij {PARTIJ1}.',
        'De kinderen zijn in het weekend van {FEESTDAG} bij {PARTIJ1}',
        1,
        'Feestdag',
        'vaderdag',
        @maxSortOrderMeervoud + 30
    );

    -- Template 4: Kinderen krijgen gelegenheid om deel van de dag bij vader te zijn
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_deel_dag_meervoud',
        'De kinderen krijgen de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ1} te zijn.',
        'De kinderen krijgen gelegenheid om deel van {FEESTDAG} bij {PARTIJ1} te zijn',
        1,
        'Feestdag',
        'vaderdag',
        @maxSortOrderMeervoud + 40
    );

    -- Template 5: Op Vaderdag loopt de zorgregeling volgens schema
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_volgens_schema_meervoud',
        'Op {FEESTDAG} loopt de zorgregeling volgens schema.',
        'Op {FEESTDAG} loopt de zorgregeling volgens schema',
        1,
        'Feestdag',
        'vaderdag',
        @maxSortOrderMeervoud + 50
    );

    -- Template 6: Eigen tekst invoeren
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES (
        'vaderdag_eigen_tekst_meervoud',
        'Eigen tekst invoeren',
        'Eigen tekst invoeren',
        1,
        'Feestdag',
        'vaderdag',
        @maxSortOrderMeervoud + 60
    );

    PRINT 'Vaderdag templates (meervoud) inserted successfully.';
END
GO

-- Step 5: Verify migration
PRINT '';
PRINT '=== Migration Verification ===';
PRINT 'Checking regelingen_templates table structure...';

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
AND TABLE_NAME = 'regelingen_templates'
AND COLUMN_NAME IN ('template_subtype', 'card_tekst')
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT 'Vaderdag templates:';
SELECT
    id,
    template_naam,
    template_tekst,
    card_tekst,
    type,
    template_subtype,
    meervoud_kinderen,
    sort_order
FROM dbo.regelingen_templates
WHERE template_subtype = 'vaderdag'
ORDER BY meervoud_kinderen, sort_order;

PRINT '';
PRINT '=== Migration Complete ===';
PRINT 'You can now filter templates by subtype using the API.';
PRINT 'Example: GET /api/lookups/regelingen-templates?type=Feestdag&subtype=vaderdag';
PRINT '';
PRINT 'To add Moederdag templates, use template_subtype = ''moederdag''';
PRINT '';

GO