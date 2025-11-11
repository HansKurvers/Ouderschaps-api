# Backend Update: Card Tekst voor Regelingen Templates

## Overzicht

Een nieuw optioneel veld `card_tekst` is toegevoegd aan de `dbo.regelingen_templates` tabel. Dit veld bevat een korte tekst die wordt getoond in selectie cards, terwijl `template_tekst` de volledige tekst blijft voor documenten.

**Database details:**
- Tabel: `dbo.regelingen_templates`
- Column: `card_tekst`
- Type: `NVARCHAR(500) NULL`
- Gebruikt voor: Korte preview in template selectie cards
- Backwards compatible: Als NULL, wordt `template_tekst` gebruikt

**Mapping:**
- Database (snake_case): `card_tekst`
- TypeScript/API (camelCase): `cardText`
- TypeScript type: `string | null` (optioneel veld)

---

## Benodigde Wijzigingen

### 1. Service Layer: `src/services/database-service.ts`

#### SELECT Query in `getRegelingenTemplates()` (regel ~1458)

**Huidige code:**
```typescript
let query = `
    SELECT id, template_naam, template_tekst, meervoud_kinderen, type, sort_order
    FROM dbo.regelingen_templates
`;
```

**Nieuwe code:**
```typescript
let query = `
    SELECT id, template_naam, template_tekst, card_tekst, meervoud_kinderen, type, sort_order
    FROM dbo.regelingen_templates
`;
```

**Let op:** Voeg `card_tekst` toe tussen `template_tekst` en `meervoud_kinderen`

---

### 2. Model Definitie (indien aanwezig)

Als er een TypeScript interface bestaat voor `RegelingTemplate`, voeg het veld toe:

```typescript
export interface RegelingTemplate {
    id: number;
    templateNaam: string;
    templateTekst: string;
    cardTekst?: string | null;  // ← NIEUW VELD
    meervoudKinderen: boolean;
    type: string;
    sortOrder?: number;
}
```

---

### 3. Response Mapping

Als er mapping logica is tussen database snake_case en API camelCase:

```typescript
// In de mapping functie
{
    id: row.id,
    templateNaam: row.template_naam,
    templateTekst: row.template_tekst,
    cardTekst: row.card_tekst,  // ← NIEUW
    meervoudKinderen: row.meervoud_kinderen,
    type: row.type,
    sortOrder: row.sort_order
}
```

---

## Verificatie

### 1. TypeScript Compilatie
```bash
cd /home/hans/ouderschaps-api
npm run build
```

Er mogen geen TypeScript errors zijn.

### 2. Test API Endpoint

**Test GET endpoint:**
```bash
curl -X GET "https://your-api.azurewebsites.net/api/regelingen-templates?type=Feestdag"
```

Verwachte response moet `cardTekst` bevatten (kan `null` zijn):
```json
[
  {
    "id": 1,
    "naam": "Kerst bij partij 1",
    "templateText": "Op Kerst is [kind] bij [partij1].",
    "cardText": null,
    "type": "Feestdag",
    "meervoudKinderen": false,
    "sortOrder": 10
  },
  {
    "id": 42,
    "naam": "Jubileum familielid",
    "templateText": "Bij een jubileum van een familielid...",
    "cardText": "Jubileum bij [partij1]: in overleg",
    "type": "Feestdag",
    "meervoudKinderen": false,
    "sortOrder": 100
  }
]
```

### 3. Database Verificatie

Controleer dat het veld bestaat:
```sql
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
AND TABLE_NAME = 'regelingen_templates'
AND COLUMN_NAME = 'card_tekst';
```

Verwacht resultaat:
```
COLUMN_NAME: card_tekst
DATA_TYPE: nvarchar
CHARACTER_MAXIMUM_LENGTH: 500
IS_NULLABLE: YES
```

---

## Logica

### Backwards Compatibility

De frontend zal de volgende logica gebruiken:

```typescript
const displayText = template.cardText || template.templateText
```

Dit betekent:
- Als `card_tekst` bestaat in database → gebruik dit voor card preview
- Als `card_tekst` NULL is → gebruik volledige `template_tekst` (zoals nu)

**Geen bestaande functionaliteit wordt gebroken!**

---

## Database Data Updates

Na de backend update kunnen templates worden bijgewerkt met korte card teksten:

```sql
-- Bijzondere dagen: korte card teksten
UPDATE dbo.regelingen_templates
SET card_tekst = 'Jubileum bij [partij1]: in overleg'
WHERE template_naam LIKE '%jubileum%' AND type = 'Feestdag';

UPDATE dbo.regelingen_templates
SET card_tekst = 'Huwelijk/partnerschap bij [partij1]: in overleg'
WHERE template_naam LIKE '%huwelijk%' OR template_naam LIKE '%partnerschap%' AND type = 'Feestdag';

-- Voeg meer updates toe voor andere bijzondere dagen templates
```

**Let op:** Template variabelen zoals `[kind]`, `[partij1]`, `[partij2]` kunnen worden gebruikt in `card_tekst`.

---

## Samenvatting Wijzigingen

| Bestand | Aantal wijzigingen | Beschrijving |
|---------|-------------------|--------------|
| `src/services/database-service.ts` | 1 regel | SELECT query - voeg `card_tekst` toe |
| Model interface (indien aanwezig) | 1 regel | Voeg `cardTekst?: string \| null` toe |
| Response mapping (indien aanwezig) | 1 regel | Map `card_tekst` naar `cardTekst` |

**Totaal:** ~3 regels code toevoegen

---

## Use Cases

### Use Case 1: Template zonder card_tekst (bestaande templates)
```
card_tekst: NULL
template_tekst: "Op Kerst is [kind] bij [partij1]."
```
→ Frontend toont: "Op Kerst is [kind] bij [partij1]." (volledig)

### Use Case 2: Template met card_tekst (bijzondere dagen)
```
card_tekst: "Jubileum bij [partij1]: in overleg"
template_tekst: "Bij een jubileum van een familielid dat bij [partij1] viert, wordt er in overleg gekeken naar de mogelijkheden voor [kind] om aanwezig te zijn..."
```
→ Frontend toont in card: "Jubileum bij [partij1]: in overleg" (kort)
→ Document krijgt: volledige `template_tekst` (lang)

---

## Rollback

Als de wijzigingen ongedaan moeten worden gemaakt:
1. Revert de code wijzigingen in git
2. Voer de database rollback uit: `003_rollback_card_tekst.sql`

---

## Notities

- Het veld is optioneel (`NULL` toegestaan in database)
- Backwards compatible - bestaande templates blijven werken
- Card tekst kan template variabelen bevatten (`[kind]`, `[partij1]`, etc.)
- De frontend (ouderschaps-web) zal dit veld automatisch gebruiken als het bestaat
- De database migratie wordt uitgevoerd via `run-migration-003.cjs`

---

**Datum:** 2025-11-11
**Auteur:** Claude Code
**Gerelateerde migratie:** 003_add_card_tekst_to_regelingen_templates.sql
