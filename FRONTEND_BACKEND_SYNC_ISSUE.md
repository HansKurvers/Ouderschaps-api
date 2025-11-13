# Frontend-Backend Synchronisatie Issue: Meerdere "Overige Afspraken"

## Het Probleem

De frontend heeft functionaliteit gebouwd om **meerdere "overige afspraken"** (situatieId: 15) op te slaan, maar de backend heeft een **unique constraint** die dit verhindert.

### Frontend Implementatie
- Staat meerdere custom regelingen toe met dezelfde situatieId (15)
- Gebruikt `_tempId` om regelingen te tracken tijdens save/match proces
- Verwacht dat alle regelingen apart worden opgeslagen

### Backend Implementatie
```typescript
// upsertZorg.ts regel 67-81
// Check if record exists for dossier + situatie combination
const existingQuery = `
    SELECT id 
    FROM dbo.zorg 
    WHERE dossier_id = @dossierId 
    AND zorg_situatie_id = @situatieId
`;
```

De backend:
1. Controleert of er al een record bestaat voor `dossier_id + zorg_situatie_id`
2. Als het bestaat → UPDATE het bestaande record
3. Als het niet bestaat → CREATE een nieuw record
4. **Resultaat**: Slechts één "overige afspraak" per dossier mogelijk!

## Oplossingsrichtingen

### Optie 1: Backend Aanpassen (Aanbevolen)
Verwijder de unique constraint voor situatieId 15 ("Anders"):

```sql
-- Check constraint
SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME = 'zorg' AND CONSTRAINT_TYPE = 'UNIQUE';

-- If constraint exists, drop it and recreate excluding situatie_id 15
```

Dan de upsert logica aanpassen:
```typescript
// Voor situatie 15, altijd CREATE (nooit UPDATE based on situatie)
if (zorgData.zorgSituatieId === 15) {
    if (zorgData.id) {
        // Update by specific ID
        await zorgRepository.update(zorgData.id, ...);
    } else {
        // Always create new for "Anders"
        await zorgRepository.create(...);
    }
} else {
    // Current logic for other situaties
}
```

### Optie 2: Database Design Aanpassen
Voeg een extra veld toe voor multiple "Anders" items:
- `volgnummer` of `custom_index` voor meerdere "Anders" per dossier
- Unique constraint wordt: `dossier_id + zorg_situatie_id + volgnummer`

### Optie 3: Frontend Aanpassen
Beperk tot één "overige afspraak" per dossier (niet ideaal voor gebruikerservaring).

## Backend Wijzigingen Nodig

1. **Accepteer `_tempId`** ✅ (Al gedaan in deze sessie)
2. **Verwijder/pas unique constraint aan** voor situatie 15
3. **Update upsert logica** om meerdere "Anders" toe te staan
4. **Test** met meerdere custom regelingen

## Communicatie naar Frontend Team

"De backend heeft momenteel een beperking waarbij slechts één 'overige afspraak' (situatieId: 15) per dossier mogelijk is door een unique constraint op dossier_id + zorg_situatie_id. Dit moet worden aangepast om de nieuwe frontend functionaliteit te ondersteunen."