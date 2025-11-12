-- Voorbeeld: Zet "partij1_oneven" template bovenaan voor Feestdagen (meerdere kinderen)
-- Dit is template ID 12: "Op {FEESTDAG} verblijven {KIND} in de oneven jaren bij {PARTIJ1} en in de even jaren bij {PARTIJ2}"

-- Stap 1: Bekijk huidige volgorde
SELECT
    id,
    template_naam,
    sort_order,
    LEFT(template_tekst, 80) as preview
FROM dbo.regelingen_templates
WHERE type = 'Feestdag'
  AND meervoud_kinderen = 1
ORDER BY sort_order;

-- Stap 2: Zet template ID 12 bovenaan
UPDATE dbo.regelingen_templates
SET sort_order = 5
WHERE id = 12;

-- Stap 3: Verifieer nieuwe volgorde
SELECT
    id,
    template_naam,
    sort_order,
    LEFT(template_tekst, 80) as preview
FROM dbo.regelingen_templates
WHERE type = 'Feestdag'
  AND meervoud_kinderen = 1
ORDER BY sort_order;

-- Resultaat: Template ID 12 staat nu bovenaan (sort_order = 5)
-- De volgorde is nu:
-- 1. ID 12 (sort_order = 5)  ← NU BOVENAAN!
-- 2. ID 5  (sort_order = 10)
-- 3. ID 15 (sort_order = 20)
-- 4. ID 10 (sort_order = 30)
-- 5. ID 8  (sort_order = 50)
