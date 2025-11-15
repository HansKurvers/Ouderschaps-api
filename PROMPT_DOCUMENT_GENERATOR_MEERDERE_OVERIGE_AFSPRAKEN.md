# Prompt voor Document Generator Claude Code

## Instructie voor aanpassing meerdere overige afspraken

Er is een belangrijke wijziging in de API waardoor nu **meerdere "overige afspraken"** per dossier mogelijk zijn. Dit moet worden aangepast in de document generator.

### Technische wijziging

**Oude situatie**: Maximaal één "overige afspraak" (zorgSituatieId: 15) per dossier
**Nieuwe situatie**: Onbeperkt aantal "overige afspraken" per dossier

### Wat moet je aanpassen:

1. **Bij het ophalen van overige afspraken**:
```typescript
// OUD (FOUT):
const overigeAfspraak = zorgItems.find(item => item.zorgSituatieId === 15);

// NIEUW (CORRECT):
const overigeAfspraken = zorgItems.filter(item => item.zorgSituatieId === 15);
```

2. **In het document template**:
- Maak een loop/iteratie voor alle overige afspraken
- Gebruik `situatieAnders` als subtitel voor elke afspraak
- Toon de `overeenkomst` tekst daaronder

3. **Voorbeeld output in document**:
```
## Overige Afspraken

### Zwemles afspraken
De kinderen gaan elke zaterdag naar zwemles bij zwembad De Waterlelie.

### Muziekles afspraken
Emma heeft pianoles op woensdag, Max heeft gitaarles op donderdag.

### Verjaardagsfeestjes
Kinderfeestjes worden in overleg gepland, beide ouders worden uitgenodigd.
```

### Belangrijk:
- Verander ALLE plaatsen waar je overige afspraken verwerkt van enkelvoud naar meervoud
- Sorteer de afspraken op `situatieAnders` (alfabetisch) of `id` (volgorde van invoer)
- Als er geen overige afspraken zijn, toon dan "Geen overige afspraken opgenomen" of sla de sectie over

De API geeft nu een array terug van overige afspraken in plaats van één item. Pas de document generator hierop aan.