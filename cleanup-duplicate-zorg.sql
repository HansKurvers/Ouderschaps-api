-- Backup eerst je data!
-- Dit script verwijdert duplicate zorg records en behoudt alleen de meest recente per situatie

-- Toon duplicates voor dossier 65
SELECT 
    z.zorg_situatie_id,
    zs.naam as situatie,
    COUNT(*) as aantal,
    STRING_AGG(CAST(z.id as VARCHAR), ', ') as ids,
    MAX(z.gewijzigd_op) as laatste_wijziging
FROM dbo.zorg z
INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
WHERE z.dossier_id = 65
GROUP BY z.zorg_situatie_id, zs.naam
HAVING COUNT(*) > 1
ORDER BY zs.naam;

-- Verwijder duplicates - behoud meest recente
WITH DuplicateRecords AS (
    SELECT 
        id,
        dossier_id,
        zorg_situatie_id,
        gewijzigd_op,
        ROW_NUMBER() OVER (
            PARTITION BY dossier_id, zorg_situatie_id 
            ORDER BY gewijzigd_op DESC, id DESC
        ) as rn
    FROM dbo.zorg
    WHERE dossier_id = 65  -- Pas aan voor andere dossiers
)
DELETE FROM dbo.zorg
WHERE id IN (
    SELECT id 
    FROM DuplicateRecords 
    WHERE rn > 1
);

-- Controleer resultaat
SELECT 
    z.id,
    zc.naam as categorie,
    zs.naam as situatie,
    LEFT(z.overeenkomst, 50) as overeenkomst_preview,
    z.gewijzigd_op
FROM dbo.zorg z
INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
WHERE z.dossier_id = 65
ORDER BY zc.naam, zs.naam;