# Document Generator Update: Meerdere Overige Afspraken

## Belangrijke Wijziging
Het is nu mogelijk om **meerdere "overige afspraken"** (situatieId: 15) per dossier op te slaan.

## Wat betekent dit voor de Document Generator?

### Oude Situatie
- Maximaal één "overige afspraak" per dossier
- Query: `WHERE dossier_id = X AND zorg_situatie_id = 15` gaf maximaal 1 record

### Nieuwe Situatie
- **Meerdere** "overige afspraken" mogelijk per dossier
- Query: `WHERE dossier_id = X AND zorg_situatie_id = 15` kan meerdere records teruggeven

## Document Generatie Aanpassingen

### 1. Data Ophalen
Bij het ophalen van zorg regelingen voor een dossier:
```typescript
// Oude aanname (NIET MEER GELDIG):
const overigeAfspraak = zorgItems.find(item => item.zorgSituatieId === 15);

// Nieuwe aanpak (CORRECT):
const overigeAfspraken = zorgItems.filter(item => item.zorgSituatieId === 15);
```

### 2. Document Template
Het document moet nu ruimte maken voor meerdere overige afspraken:

```markdown
## Overige Afspraken
<!-- Oude template -->
<indien één overige afspraak>

<!-- Nieuwe template -->
<voor elke overige afspraak:>
### {situatieAnders}
{overeenkomst}
</voor elke>
```

### 3. Voorbeeld Output
```
## Overige Afspraken

### Zwemles afspraken
De kinderen gaan elke zaterdag naar zwemles bij zwembad De Waterlelie.

### Muziekles afspraken  
Emma heeft pianoles op woensdag, Max heeft gitaarles op donderdag.

### Verjaardagsfeestjes
Kinderfeestjes worden in overleg gepland, beide ouders worden uitgenodigd.
```

## Database Query Voorbeeld
```sql
-- Haal ALLE zorg items op, inclusief meerdere "overige afspraken"
SELECT z.*, zs.naam as situatie_naam
FROM dbo.zorg z
JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
WHERE z.dossier_id = @dossierId
ORDER BY 
  z.zorg_categorie_id,
  z.zorg_situatie_id,
  z.situatie_anders, -- Sorteert overige afspraken op naam
  z.id
```

## Belangrijke Aandachtspunten

1. **Loop door alle overige afspraken** - niet alleen de eerste
2. **Gebruik situatieAnders als titel** voor elke overige afspraak
3. **Sorteer consistent** - bijvoorbeeld alfabetisch op situatieAnders
4. **Geen limiet** - toon alle overige afspraken die zijn ingevoerd

## API Response Structuur
```json
{
  "zorgRegelingen": [
    {
      "id": 123,
      "zorgSituatieId": 15,
      "situatieAnders": "Zwemles afspraken",
      "overeenkomst": "De kinderen gaan elke zaterdag..."
    },
    {
      "id": 124,
      "zorgSituatieId": 15,
      "situatieAnders": "Muziekles afspraken",
      "overeenkomst": "Emma heeft pianoles op woensdag..."
    }
    // Meer overige afspraken mogelijk!
  ]
}
```

## Samenvatting
De document generator moet worden aangepast om **meerdere** overige afspraken te verwerken in plaats van slechts één. Dit betekent loops/iteraties gebruiken waar voorheen enkelvoudige waarden werden verwacht.