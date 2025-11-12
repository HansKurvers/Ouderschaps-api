-- =============================================
-- Migration: Add templates for all bijzondere dagen
-- Description: Add specific templates for Moederdag, Verjaardagen, and Jubilea
-- Date: 2025-11-12
-- =============================================

-- This migration assumes 004_add_template_subtype_and_vaderdag.sql has been run first

-- =============================================
-- MOEDERDAG TEMPLATES (ID: 33)
-- =============================================

PRINT '';
PRINT '=== Adding Moederdag templates ===';

-- Check if Moederdag templates already exist
IF NOT EXISTS (
    SELECT 1 FROM dbo.regelingen_templates 
    WHERE template_subtype = 'moederdag'
)
BEGIN
    DECLARE @maxSortOrderMoederdag INT;
    SELECT @maxSortOrderMoederdag = ISNULL(MAX(sort_order), 100) FROM dbo.regelingen_templates WHERE type = 'Feestdag';

    -- Moederdag templates (enkelvoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('moederdag_bij_moeder', '{KIND} is op {FEESTDAG} bij {PARTIJ2}.', '{KIND} is op {FEESTDAG} bij {PARTIJ2}', 0, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 10),
        ('moederdag_met_avond', '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}.', '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}', 0, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 20),
        ('moederdag_weekend', '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ2}.', '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ2}', 0, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 30),
        ('moederdag_deel_dag', '{KIND} krijgt de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ2} te zijn.', '{KIND} krijgt gelegenheid om deel van {FEESTDAG} bij {PARTIJ2} te zijn', 0, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 40),
        ('moederdag_volgens_schema', 'Op {FEESTDAG} loopt de zorgregeling volgens schema.', 'Op {FEESTDAG} loopt de zorgregeling volgens schema', 0, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 50),
        ('moederdag_eigen_tekst', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 0, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 60);

    -- Moederdag templates (meervoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('moederdag_bij_moeder_meervoud', 'De kinderen zijn op {FEESTDAG} bij {PARTIJ2}.', 'De kinderen zijn op {FEESTDAG} bij {PARTIJ2}', 1, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 10),
        ('moederdag_met_avond_meervoud', 'De kinderen zijn op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}.', 'De kinderen zijn op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}', 1, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 20),
        ('moederdag_weekend_meervoud', 'De kinderen zijn in het weekend van {FEESTDAG} bij {PARTIJ2}.', 'De kinderen zijn in het weekend van {FEESTDAG} bij {PARTIJ2}', 1, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 30),
        ('moederdag_deel_dag_meervoud', 'De kinderen krijgen de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ2} te zijn.', 'De kinderen krijgen gelegenheid om deel van {FEESTDAG} bij {PARTIJ2} te zijn', 1, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 40),
        ('moederdag_volgens_schema_meervoud', 'Op {FEESTDAG} loopt de zorgregeling volgens schema.', 'Op {FEESTDAG} loopt de zorgregeling volgens schema', 1, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 50),
        ('moederdag_eigen_tekst_meervoud', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 1, 'Feestdag', 'moederdag', @maxSortOrderMoederdag + 60);

    PRINT 'Moederdag templates added successfully.';
END
ELSE
BEGIN
    PRINT 'Moederdag templates already exist, skipping.';
END
GO

-- =============================================
-- VERJAARDAG KINDEREN TEMPLATES (ID: 35)
-- =============================================

PRINT '';
PRINT '=== Adding Verjaardag kinderen templates ===';

IF NOT EXISTS (
    SELECT 1 FROM dbo.regelingen_templates 
    WHERE template_subtype = 'verjaardag_kinderen'
)
BEGIN
    DECLARE @maxSortOrderVerjKind INT;
    SELECT @maxSortOrderVerjKind = ISNULL(MAX(sort_order), 200) FROM dbo.regelingen_templates WHERE type = 'Feestdag';

    -- Verjaardag kinderen templates (enkelvoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('verj_kind_bij_jarige', '{KIND} viert zijn/haar verjaardag bij degene waar {KIND} op die dag volgens schema is.', '{KIND} viert verjaardag waar hij/zij volgens schema is', 0, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 10),
        ('verj_kind_beide_vieren', '{KIND} viert zijn/haar verjaardag met beide ouders samen.', '{KIND} viert verjaardag met beide ouders', 0, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 20),
        ('verj_kind_wisselend', '{KIND} viert zijn/haar verjaardag het ene jaar bij {PARTIJ1} en het andere jaar bij {PARTIJ2}.', '{KIND} viert verjaardag wisselend per jaar', 0, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 30),
        ('verj_kind_dubbel_feest', '{KIND} heeft twee verjaardagsfeestjes: één bij {PARTIJ1} en één bij {PARTIJ2}.', '{KIND} heeft twee verjaardagsfeestjes', 0, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 40),
        ('verj_kind_overleg', 'De verjaardag van {KIND} wordt in onderling overleg gevierd.', 'Verjaardag {KIND} in onderling overleg', 0, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 50),
        ('verj_kind_eigen_tekst', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 0, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 60);

    -- Verjaardag kinderen templates (meervoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('verj_kind_bij_jarige_meervoud', 'De kinderen vieren hun verjaardag bij degene waar zij op die dag volgens schema zijn.', 'Kinderen vieren verjaardag waar zij volgens schema zijn', 1, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 10),
        ('verj_kind_beide_vieren_meervoud', 'De kinderen vieren hun verjaardag met beide ouders samen.', 'Kinderen vieren verjaardag met beide ouders', 1, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 20),
        ('verj_kind_wisselend_meervoud', 'De kinderen vieren hun verjaardag het ene jaar bij {PARTIJ1} en het andere jaar bij {PARTIJ2}.', 'Kinderen vieren verjaardag wisselend per jaar', 1, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 30),
        ('verj_kind_dubbel_feest_meervoud', 'De kinderen hebben twee verjaardagsfeestjes: één bij {PARTIJ1} en één bij {PARTIJ2}.', 'Kinderen hebben twee verjaardagsfeestjes', 1, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 40),
        ('verj_kind_overleg_meervoud', 'De verjaardagen van de kinderen worden in onderling overleg gevierd.', 'Verjaardagen kinderen in onderling overleg', 1, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 50),
        ('verj_kind_eigen_tekst_meervoud', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 1, 'Feestdag', 'verjaardag_kinderen', @maxSortOrderVerjKind + 60);

    PRINT 'Verjaardag kinderen templates added successfully.';
END
GO

-- =============================================
-- VERJAARDAG OUDERS TEMPLATES (ID: 36)
-- =============================================

PRINT '';
PRINT '=== Adding Verjaardag ouders templates ===';

IF NOT EXISTS (
    SELECT 1 FROM dbo.regelingen_templates 
    WHERE template_subtype = 'verjaardag_ouders'
)
BEGIN
    DECLARE @maxSortOrderVerjOuders INT;
    SELECT @maxSortOrderVerjOuders = ISNULL(MAX(sort_order), 300) FROM dbo.regelingen_templates WHERE type = 'Feestdag';

    -- Verjaardag ouders templates (enkelvoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('verj_ouder_bezoek', '{KIND} mag op de verjaardag van beide ouders op bezoek komen.', '{KIND} mag beide ouders bezoeken op hun verjaardag', 0, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 10),
        ('verj_ouder_hele_dag', '{KIND} is op de verjaardag van {PARTIJ1}/{PARTIJ2} de hele dag bij de jarige ouder.', '{KIND} is hele dag bij jarige ouder', 0, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 20),
        ('verj_ouder_deel_dag', '{KIND} is een deel van de dag bij de jarige ouder op diens verjaardag.', '{KIND} is deel van dag bij jarige ouder', 0, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 30),
        ('verj_ouder_volgens_schema', 'Op de verjaardag van de ouders loopt de zorgregeling volgens schema.', 'Op verjaardag ouders loopt zorgregeling door', 0, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 40),
        ('verj_ouder_overleg', 'Voor de verjaardag van de ouders maken partijen in onderling overleg afspraken.', 'Verjaardag ouders in onderling overleg', 0, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 50),
        ('verj_ouder_eigen_tekst', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 0, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 60);

    -- Verjaardag ouders templates (meervoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('verj_ouder_bezoek_meervoud', 'De kinderen mogen op de verjaardag van beide ouders op bezoek komen.', 'Kinderen mogen beide ouders bezoeken op hun verjaardag', 1, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 10),
        ('verj_ouder_hele_dag_meervoud', 'De kinderen zijn op de verjaardag van {PARTIJ1}/{PARTIJ2} de hele dag bij de jarige ouder.', 'Kinderen zijn hele dag bij jarige ouder', 1, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 20),
        ('verj_ouder_deel_dag_meervoud', 'De kinderen zijn een deel van de dag bij de jarige ouder op diens verjaardag.', 'Kinderen zijn deel van dag bij jarige ouder', 1, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 30),
        ('verj_ouder_volgens_schema_meervoud', 'Op de verjaardag van de ouders loopt de zorgregeling volgens schema.', 'Op verjaardag ouders loopt zorgregeling door', 1, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 40),
        ('verj_ouder_overleg_meervoud', 'Voor de verjaardag van de ouders maken partijen in onderling overleg afspraken.', 'Verjaardag ouders in onderling overleg', 1, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 50),
        ('verj_ouder_eigen_tekst_meervoud', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 1, 'Feestdag', 'verjaardag_ouders', @maxSortOrderVerjOuders + 60);

    PRINT 'Verjaardag ouders templates added successfully.';
END
GO

-- =============================================
-- VERJAARDAG GROOTOUDERS TEMPLATES (ID: 37)
-- =============================================

PRINT '';
PRINT '=== Adding Verjaardag grootouders templates ===';

IF NOT EXISTS (
    SELECT 1 FROM dbo.regelingen_templates 
    WHERE template_subtype = 'verjaardag_grootouders'
)
BEGIN
    DECLARE @maxSortOrderVerjGroot INT;
    SELECT @maxSortOrderVerjGroot = ISNULL(MAX(sort_order), 400) FROM dbo.regelingen_templates WHERE type = 'Feestdag';

    -- Verjaardag grootouders templates (enkelvoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('verj_groot_beide_bezoeken', '{KIND} bezoekt de grootouders van beide kanten op hun verjaardag.', '{KIND} bezoekt alle grootouders op verjaardag', 0, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 10),
        ('verj_groot_bij_ouder', '{KIND} bezoekt grootouders samen met de ouder aan wiens kant zij familie zijn.', '{KIND} bezoekt grootouders met betreffende ouder', 0, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 20),
        ('verj_groot_volgens_schema', 'Voor verjaardagen van grootouders loopt de zorgregeling volgens schema.', 'Bij verjaardag grootouders loopt zorgregeling door', 0, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 30),
        ('verj_groot_overleg', 'Bezoek aan grootouders op verjaardagen wordt in onderling overleg geregeld.', 'Verjaardag grootouders in onderling overleg', 0, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 40),
        ('verj_groot_eigen_keuze', '{KIND} mag zelf kiezen of hij/zij de grootouders bezoekt op hun verjaardag.', '{KIND} kiest zelf over bezoek grootouders', 0, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 50),
        ('verj_groot_eigen_tekst', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 0, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 60);

    -- Verjaardag grootouders templates (meervoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('verj_groot_beide_bezoeken_meervoud', 'De kinderen bezoeken de grootouders van beide kanten op hun verjaardag.', 'Kinderen bezoeken alle grootouders op verjaardag', 1, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 10),
        ('verj_groot_bij_ouder_meervoud', 'De kinderen bezoeken grootouders samen met de ouder aan wiens kant zij familie zijn.', 'Kinderen bezoeken grootouders met betreffende ouder', 1, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 20),
        ('verj_groot_volgens_schema_meervoud', 'Voor verjaardagen van grootouders loopt de zorgregeling volgens schema.', 'Bij verjaardag grootouders loopt zorgregeling door', 1, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 30),
        ('verj_groot_overleg_meervoud', 'Bezoek aan grootouders op verjaardagen wordt in onderling overleg geregeld.', 'Verjaardag grootouders in onderling overleg', 1, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 40),
        ('verj_groot_eigen_keuze_meervoud', 'De kinderen mogen zelf kiezen of zij de grootouders bezoeken op hun verjaardag.', 'Kinderen kiezen zelf over bezoek grootouders', 1, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 50),
        ('verj_groot_eigen_tekst_meervoud', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 1, 'Feestdag', 'verjaardag_grootouders', @maxSortOrderVerjGroot + 60);

    PRINT 'Verjaardag grootouders templates added successfully.';
END
GO

-- =============================================
-- BIJZONDERE JUBILEA TEMPLATES (ID: 38)
-- =============================================

PRINT '';
PRINT '=== Adding Bijzondere jubilea templates ===';

IF NOT EXISTS (
    SELECT 1 FROM dbo.regelingen_templates 
    WHERE template_subtype = 'bijzondere_jubilea'
)
BEGIN
    DECLARE @maxSortOrderJubilea INT;
    SELECT @maxSortOrderJubilea = ISNULL(MAX(sort_order), 500) FROM dbo.regelingen_templates WHERE type = 'Feestdag';

    -- Bijzondere jubilea templates (enkelvoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('jubilea_aanwezig', '{KIND} is aanwezig bij bijzondere jubilea van familieleden.', '{KIND} is aanwezig bij familiejubilea', 0, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 10),
        ('jubilea_familie_kant', '{KIND} is bij jubilea aanwezig bij de familie van de betreffende kant.', '{KIND} bij jubilea van betreffende familiekant', 0, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 20),
        ('jubilea_overleg', 'Voor bijzondere jubilea overleggen partijen per gelegenheid.', 'Bijzondere jubilea in onderling overleg', 0, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 30),
        ('jubilea_schema_uitzondering', 'Bij bijzondere jubilea kan van het reguliere schema worden afgeweken in overleg.', 'Bij jubilea afwijken van schema mogelijk', 0, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 40),
        ('jubilea_informeren', 'Partijen informeren elkaar tijdig over bijzondere jubilea in de familie.', 'Partijen informeren elkaar over jubilea', 0, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 50),
        ('jubilea_eigen_tekst', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 0, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 60);

    -- Bijzondere jubilea templates (meervoud)
    INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, template_subtype, sort_order)
    VALUES 
        ('jubilea_aanwezig_meervoud', 'De kinderen zijn aanwezig bij bijzondere jubilea van familieleden.', 'Kinderen zijn aanwezig bij familiejubilea', 1, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 10),
        ('jubilea_familie_kant_meervoud', 'De kinderen zijn bij jubilea aanwezig bij de familie van de betreffende kant.', 'Kinderen bij jubilea van betreffende familiekant', 1, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 20),
        ('jubilea_overleg_meervoud', 'Voor bijzondere jubilea overleggen partijen per gelegenheid.', 'Bijzondere jubilea in onderling overleg', 1, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 30),
        ('jubilea_schema_uitzondering_meervoud', 'Bij bijzondere jubilea kan van het reguliere schema worden afgeweken in overleg.', 'Bij jubilea afwijken van schema mogelijk', 1, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 40),
        ('jubilea_informeren_meervoud', 'Partijen informeren elkaar tijdig over bijzondere jubilea in de familie.', 'Partijen informeren elkaar over jubilea', 1, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 50),
        ('jubilea_eigen_tekst_meervoud', 'Eigen tekst invoeren', 'Eigen tekst invoeren', 1, 'Feestdag', 'bijzondere_jubilea', @maxSortOrderJubilea + 60);

    PRINT 'Bijzondere jubilea templates added successfully.';
END
GO

-- =============================================
-- VERIFICATION
-- =============================================

PRINT '';
PRINT '=== Migration Verification ===';
PRINT '';
PRINT 'Summary of template_subtypes added:';

SELECT 
    template_subtype,
    type,
    COUNT(*) as template_count,
    SUM(CASE WHEN meervoud_kinderen = 0 THEN 1 ELSE 0 END) as enkelvoud_count,
    SUM(CASE WHEN meervoud_kinderen = 1 THEN 1 ELSE 0 END) as meervoud_count
FROM dbo.regelingen_templates
WHERE template_subtype IN ('vaderdag', 'moederdag', 'verjaardag_kinderen', 'verjaardag_ouders', 'verjaardag_grootouders', 'bijzondere_jubilea')
GROUP BY template_subtype, type
ORDER BY template_subtype;

PRINT '';
PRINT '=== Migration Complete ===';
PRINT '';
PRINT 'Usage examples:';
PRINT '  GET /api/lookups/regelingen-templates?type=Feestdag&subtype=moederdag';
PRINT '  GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_kinderen';
PRINT '  GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_ouders';
PRINT '  GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_grootouders';
PRINT '  GET /api/lookups/regelingen-templates?type=Feestdag&subtype=bijzondere_jubilea';
PRINT '';

GO