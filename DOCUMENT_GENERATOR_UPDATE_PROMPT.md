# Document Generator Update - Template System Wijzigingen

## Context
Er zijn significante wijzigingen doorgevoerd in het template systeem van de Ouderschaps-API. De document generator moet rekening houden met deze wijzigingen bij het genereren van documenten.

## Belangrijke Database Wijzigingen

### 1. Template Types
De database kent nu 4 template types:
- `Feestdag` - Voor algemene feestdagen (Sinterklaas, Kerst, etc.)
- `Vakantie` - Voor schoolvakanties
- `Algemeen` - Voor algemene beslissingen
- `Bijzondere dag` - Voor speciale gelegenheden (NIEUW!)

### 2. Template Subtypes
Templates hebben nu een `template_subtype` veld voor betere filtering:
- **Feestdag**: `subtype = 'algemeen'`
- **Vakantie**: `subtype = 'vakantie'`
- **Algemeen**: `subtype = 'beslissing'`
- **Bijzondere dag** subtypes:
  - `vaderdag` - Vaderdag templates
  - `moederdag` - Moederdag templates
  - `verjaardag_kind` - Verjaardag van kinderen
  - `verjaardag_ouders` - Verjaardag van ouders (partij1/partij2)
  - `verjaardag_grootouders` - Verjaardag van grootouders
  - `bijzondere_jubilea` - Bijzondere jubilea/gebeurtenissen

### 3. Verwijderde Kolom
De kolom `card_tekst` is volledig verwijderd uit de database en mag niet meer gebruikt worden.

## Placeholder Systeem

### Enkelvoud vs Meervoud
Templates zijn strikt gescheiden op basis van `meervoud_kinderen`:
- **Enkelvoud** (`meervoud_kinderen = false`): Gebruikt `{KIND}` placeholder
- **Meervoud** (`meervoud_kinderen = true`): Gebruikt `{KINDEREN}` placeholder

### Beschikbare Placeholders
1. **{KIND}** / **{KINDEREN}** - Naam(en) van het kind/de kinderen
2. **{PARTIJ1}** - Naam van partij 1 (vaak vader)
3. **{PARTIJ2}** - Naam van partij 2 (vaak moeder)
4. **{FEESTDAG}** - Naam van de feestdag
5. **{VAKANTIE}** - Naam van de vakantie
6. **{BESLISSING}** - Type beslissing (voor Algemeen type)

## API Endpoints

### Ophalen Templates
```
GET /api/lookups/regelingen-templates?type={type}&meervoudKinderen={true/false}&subtype={subtype}
```

Parameters:
- `type` (optioneel): Filter op type ('Feestdag', 'Vakantie', 'Algemeen', 'Bijzondere dag')
- `meervoudKinderen` (optioneel): `true` of `false`
- `subtype` (optioneel): Filter op subtype

## Template Tekst Voorbeelden

### Enkelvoud
```
"Op {FEESTDAG} verblijft {KIND} bij {PARTIJ1}."
"{KIND} verblijft deze Vaderdag waar {KIND} zou zijn volgens de wekelijkse zorgregeling."
```

### Meervoud
```
"Op {FEESTDAG} verblijven {KINDEREN} bij {PARTIJ1}."
"{KINDEREN} verblijven deze Vaderdag waar {KINDEREN} zouden zijn volgens de wekelijkse zorgregeling."
```

## Belangrijke Aandachtspunten voor Document Generator

### 1. Grammatica Correcties
Bij meervoud templates zijn werkwoorden aangepast:
- `verblijft` → `verblijven`
- `zou zijn` → `zouden zijn`
- `is` → `zijn`
- `heeft` → `hebben`

### 2. Template Selectie Logica
```javascript
// Voorbeeld logica voor template selectie
const meervoudKinderen = kinderen.length > 1;
const templates = await getTemplates({
  type: 'Bijzondere dag',
  subtype: 'vaderdag',
  meervoudKinderen: meervoudKinderen
});
```

### 3. Placeholder Vervanging
De document generator moet:
1. Detecteren of er één of meerdere kinderen zijn
2. De juiste templates ophalen met `meervoudKinderen` parameter
3. Placeholders vervangen met actuele gegevens:
   - Bij 1 kind: `{KIND}` → "Emma"
   - Bij 2+ kinderen: `{KINDEREN}` → "Emma en Max"

### 4. Speciale Template: "volgens zorgregeling"
Elke categorie heeft nu een optie "volgens de wekelijkse zorgregeling":
- ID's eindigend op 168-183 voor verschillende categorieën
- Deze verwijzen naar de standaard zorgregeling zonder uitzonderingen

### 5. Database Query Aanpassingen
```sql
-- Oude query (NIET MEER GEBRUIKEN)
SELECT id, template_naam, template_tekst, card_tekst, ...

-- Nieuwe query
SELECT id, template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order
FROM dbo.regelingen_templates
WHERE type = @Type 
  AND (@Subtype IS NULL OR template_subtype = @Subtype)
  AND meervoud_kinderen = @MeervoudKinderen
ORDER BY sort_order ASC, template_naam ASC
```

## Migratie Checklist

- [ ] Verwijder alle referenties naar `card_tekst`
- [ ] Update queries om `template_subtype` te gebruiken
- [ ] Implementeer logica voor enkelvoud/meervoud selectie
- [ ] Test met nieuwe "Bijzondere dag" type templates
- [ ] Valideer placeholder vervanging voor {KIND}/{KINDEREN}
- [ ] Controleer grammatica in gegenereerde teksten

## Voorbeeldcode voor Template Gebruik

```typescript
// Interface voor template
interface RegelingTemplate {
    id: number;
    templateNaam: string;
    templateTekst: string;
    // cardTekst is VERWIJDERD!
    meervoudKinderen: boolean;
    type: string;
    templateSubtype?: string | null;
    sortOrder: number;
}

// Functie voor template verwerking
function processTemplate(template: RegelingTemplate, data: any): string {
    let text = template.templateTekst;
    
    // Vervang placeholders
    if (template.meervoudKinderen) {
        text = text.replace(/{KINDEREN}/g, data.kinderenNamen);
    } else {
        text = text.replace(/{KIND}/g, data.kindNaam);
    }
    
    text = text.replace(/{PARTIJ1}/g, data.partij1Naam);
    text = text.replace(/{PARTIJ2}/g, data.partij2Naam);
    text = text.replace(/{FEESTDAG}/g, data.feestdag || '');
    text = text.replace(/{VAKANTIE}/g, data.vakantie || '');
    text = text.replace(/{BESLISSING}/g, data.beslissing || '');
    
    return text;
}
```

## Contact
Voor vragen over deze wijzigingen, neem contact op met het backend team.