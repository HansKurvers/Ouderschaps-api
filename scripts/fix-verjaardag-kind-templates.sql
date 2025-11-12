-- Fix foutieve placeholders in verjaardag_kind templates

-- Fix ID 126
UPDATE dbo.regelingen_templates
SET template_tekst = 'De kinderen vieren hun verjaardag bij degene waar zij op die dag volgens schema zijn.',
    card_tekst = 'De kinderen vieren verjaardag waar zij volgens schema zijn'
WHERE id = 126;

-- Fix ID 130  
UPDATE dbo.regelingen_templates
SET template_tekst = 'De verjaardagen van de kinderen worden in onderling overleg gevierd.',
    card_tekst = 'Verjaardagen kinderen in onderling overleg'
WHERE id = 130;

-- Fix ID 154 (verkeerde grammatica)
UPDATE dbo.regelingen_templates
SET card_tekst = 'De kinderen kiezen zelf over bezoek grootouders'
WHERE id = 154;

PRINT 'Templates gefixed!';

-- Toon de gewijzigde templates
SELECT id, template_tekst, card_tekst
FROM dbo.regelingen_templates
WHERE id IN (126, 130, 154);