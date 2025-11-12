# Prompt voor Document Generator Claude Code

## Instructie voor Claude Code in Document Generator

Je werkt aan de document generator voor ouderschapsplannen. Er zijn belangrijke wijzigingen in het template systeem die je moet implementeren:

### Database Wijzigingen
1. **VERWIJDERD**: De kolom `card_tekst` bestaat niet meer - verwijder alle referenties
2. **NIEUW TYPE**: "Bijzondere dag" is toegevoegd naast Feestdag, Vakantie en Algemeen
3. **SUBTYPES**: Templates hebben nu een `template_subtype` veld voor filtering:
   - Bijzondere dag: vaderdag, moederdag, verjaardag_kind, verjaardag_ouders, verjaardag_grootouders, bijzondere_jubilea
   - Feestdag: algemeen
   - Vakantie: vakantie
   - Algemeen: beslissing

### Enkelvoud/Meervoud Systeem
Templates zijn strikt gescheiden:
- **1 kind**: `meervoudKinderen=false`, gebruikt `{KIND}` placeholder
- **2+ kinderen**: `meervoudKinderen=true`, gebruikt `{KINDEREN}` placeholder

Werkwoorden zijn aangepast voor meervoud:
- verblijft → verblijven
- zou → zouden
- is → zijn
- heeft → hebben

### API Gebruik
```
GET /api/lookups/regelingen-templates?type={type}&meervoudKinderen={true/false}&subtype={subtype}
```

### Implementatie Vereisten
1. Detecteer aantal kinderen in het dossier
2. Haal templates op met correcte `meervoudKinderen` waarde
3. Vervang placeholders:
   - {KIND}/{KINDEREN} - kindnamen
   - {PARTIJ1}/{PARTIJ2} - oudersnamen
   - {FEESTDAG}/{VAKANTIE}/{BESLISSING} - context specifiek
4. Update alle SQL queries - verwijder `card_tekst`
5. Test nieuwe "Bijzondere dag" templates

### RegelingTemplate Interface
```typescript
interface RegelingTemplate {
    id: number;
    templateNaam: string;
    templateTekst: string;
    meervoudKinderen: boolean;
    type: string;
    templateSubtype?: string | null;
    sortOrder: number;
}
```

**BELANGRIJK**: Alle hardcoded "De kinderen" tekst is vervangen door {KINDEREN} placeholders. De document generator moet deze dynamisch vervangen met de werkelijke kindnamen.