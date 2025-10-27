-- Check voor duplicate zorg records per situatie per dossier
SELECT 
    d.id as dossier_id,
    d.dossier_nummer,
    zc.naam as categorie,
    zs.naam as situatie,
    z.zorg_situatie_id,
    COUNT(*) as aantal_records,
    STRING_AGG(CAST(z.id as VARCHAR), ', ') as zorg_ids,
    STRING_AGG(z.overeenkomst, ' | ') as overeenkomsten
FROM dbo.zorg z
INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
INNER JOIN dbo.dossiers d ON z.dossier_id = d.id
WHERE z.dossier_id = 65  -- Vervang met het dossier ID
GROUP BY d.id, d.dossier_nummer, zc.naam, zs.naam, z.zorg_situatie_id
HAVING COUNT(*) > 1
ORDER BY zc.naam, zs.naam;

-- Bekijk alle zorg records voor dossier 65
SELECT 
    z.id,
    z.dossier_id,
    zc.naam as categorie,
    zs.naam as situatie,
    z.overeenkomst,
    z.aangemaakt_op,
    z.gewijzigd_op
FROM dbo.zorg z
INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
WHERE z.dossier_id = 65
ORDER BY zc.naam, zs.naam, z.aangemaakt_op;