# Plan: Meerdere "Overige Afspraken" Mogelijk Maken

## Huidige Situatie
- De zorg tabel heeft een logische constraint: één record per `dossier_id + zorg_situatie_id`
- Dit is prima voor standaard situaties (bijv. "50/50 verdeling")
- Problematisch voor situatie 15 ("Anders") waar gebruikers meerdere custom afspraken willen

## Oplossing: Speciale Behandeling voor Situatie 15

### Stap 1: Aanpassen Upsert Logica
In `/src/functions/zorg/upsertZorg.ts`:

```typescript
// Voor situatie 15 ("Anders"):
// - Bij CREATE: altijd nieuw record aanmaken
// - Bij UPDATE: alleen updaten als specifiek ID meegegeven wordt
```

### Stap 2: Database Impact
**Geen database schema wijzigingen nodig!** 
- Geen nieuwe kolommen
- Geen constraint wijzigingen
- Alleen logica aanpassing in de applicatie

### Stap 3: API Gedrag
- **CREATE** (geen id): Altijd nieuw record voor situatie 15
- **UPDATE** (met id): Update specifiek record
- **Andere situaties**: Bestaande logica (prevent duplicates)

## Implementatie Stappen

1. **Update upsertZorg.ts** (±20 regels code)
   - Check of `zorgSituatieId === 15`
   - Skip duplicate check voor "Anders"
   - Behoud normale flow voor andere situaties

2. **Test Scenarios**
   - Meerdere "overige afspraken" toevoegen
   - Specifieke "overige afspraak" updaten via ID
   - Normale situaties blijven werken als voorheen

3. **Documentatie**
   - Update API documentatie
   - Informeer frontend team

## Voordelen
- ✅ Minimale code wijziging
- ✅ Geen database migratie nodig
- ✅ Backward compatible
- ✅ Lost het probleem volledig op

## Risico's
- ⚠️ Gebruikers kunnen per ongeluk duplicate "overige afspraken" maken
- ✅ Mitigatie: Frontend kan duplicates voorkomen met goede UX

## Alternatieve Oplossingen (Niet Aanbevolen)
1. **Nieuwe tabel** voor custom afspraken → Te complex
2. **Volgnummer kolom** toevoegen → Database migratie nodig
3. **JSON veld** voor multiple items → Verliest relationele integriteit

## Conclusie
De voorgestelde oplossing is eenvoudig, effectief en heeft minimale impact. Het lost het probleem op zonder database wijzigingen.