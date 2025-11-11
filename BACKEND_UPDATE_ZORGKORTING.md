# Backend Update: Zorgkorting Percentage Alle Kinderen

## Overzicht

Het nieuwe database veld `zorgkorting_percentage_alle_kinderen` is toegevoegd aan de `dbo.alimentaties` tabel. Dit veld moet worden opgenomen in de backend API om correct te worden opgeslagen en opgehaald.

**Database details:**
- Tabel: `dbo.alimentaties`
- Column: `zorgkorting_percentage_alle_kinderen`
- Type: `DECIMAL(5,2) NULL`
- Gebruikt wanneer: `bedragen_alle_kinderen_gelijk = true`

**Mapping:**
- Database (snake_case): `zorgkorting_percentage_alle_kinderen`
- TypeScript/API (camelCase): `zorgkortingPercentageAlleKinderen`
- TypeScript type: `number | null` (optioneel veld)

---

## Benodigde Wijzigingen

### 1. Model Definitie: `src/models/Alimentatie.ts`

#### 1.1 Alimentatie Interface (regel ~20)

**Toevoegen na regel 20 (na `alimentatiegerechtigde`):**

```typescript
// V3: Alimentatie settings fields - 3 velden (for document generation)
bedragenAlleKinderenGelijk?: boolean | null;
alimentatiebedragPerKind?: number | null;
zorgkortingPercentageAlleKinderen?: number | null;  // ← NIEUW VELD
alimentatiegerechtigde?: string | null;
```

#### 1.2 CreateAlimentatieDto Interface (regel ~67)

**Toevoegen na regel 67 (na `alimentatiegerechtigde`):**

```typescript
// V3: Alimentatie settings fields
bedragenAlleKinderenGelijk?: boolean;
alimentatiebedragPerKind?: number;
zorgkortingPercentageAlleKinderen?: number;  // ← NIEUW VELD
alimentatiegerechtigde?: string;
```

#### 1.3 UpdateAlimentatieDto Interface (regel ~85)

**Toevoegen na regel 85 (na `alimentatiegerechtigde`):**

```typescript
// V3: Alimentatie settings fields
bedragenAlleKinderenGelijk?: boolean;
alimentatiebedragPerKind?: number;
zorgkortingPercentageAlleKinderen?: number;  // ← NIEUW VELD
alimentatiegerechtigde?: string;
```

---

### 2. Service Layer: `src/services/alimentatie-service.ts`

#### 2.1 SELECT Query in `getAlimentatieByDossierId()` (regel ~56-72)

**Huidige code (regel 70-72):**
```typescript
bedragen_alle_kinderen_gelijk as bedragenAlleKinderenGelijk,
alimentatiebedrag_per_kind as alimentatiebedragPerKind,
alimentatiegerechtigde
```

**Nieuwe code:**
```typescript
bedragen_alle_kinderen_gelijk as bedragenAlleKinderenGelijk,
alimentatiebedrag_per_kind as alimentatiebedragPerKind,
zorgkorting_percentage_alle_kinderen as zorgkortingPercentageAlleKinderen,
alimentatiegerechtigde
```

#### 2.2 INSERT Query in `createAlimentatie()` (regel ~149-192)

**Stap 1: Input parameter toevoegen (na regel 162):**
```typescript
.input('BedragenGelijk', sql.Bit, data.bedragenAlleKinderenGelijk ?? null)
.input('BedragPerKind', sql.Decimal(10, 2), data.alimentatiebedragPerKind || null)
.input('ZorgkortingPercentage', sql.Decimal(5, 2), data.zorgkortingPercentageAlleKinderen || null)  // ← NIEUW
.input('Alimentatiegerechtigde', sql.VarChar(255), data.alimentatiegerechtigde || null)
```

**Stap 2: INSERT kolom toevoegen (regel 165-170):**
```sql
INSERT INTO dbo.alimentaties
(dossier_id, netto_besteedbaar_gezinsinkomen, kosten_kinderen, bijdrage_template,
 storting_ouder1_kinderrekening, storting_ouder2_kinderrekening, kinderrekening_kostensoorten,
 kinderrekening_maximum_opname, kinderrekening_maximum_opname_bedrag,
 kinderbijslag_storten_op_kinderrekening, kindgebonden_budget_storten_op_kinderrekening,
 bedragen_alle_kinderen_gelijk, alimentatiebedrag_per_kind,
 zorgkorting_percentage_alle_kinderen, alimentatiegerechtigde)
```

**Stap 3: OUTPUT kolom toevoegen (regel 171-187):**
```sql
inserted.bedragen_alle_kinderen_gelijk as bedragenAlleKinderenGelijk,
inserted.alimentatiebedrag_per_kind as alimentatiebedragPerKind,
inserted.zorgkorting_percentage_alle_kinderen as zorgkortingPercentageAlleKinderen,
inserted.alimentatiegerechtigde
```

**Stap 4: VALUES parameter toevoegen (regel 188-191):**
```sql
VALUES (@DossierId, @NettoInkomen, @KostenKinderen, @BijdrageTemplateId,
        @StortingOuder1, @StortingOuder2, @Kostensoorten,
        @MaximumOpname, @MaximumOpnameBedrag, @KinderbijslagStorten, @KindgebondenBudgetStorten,
        @BedragenGelijk, @BedragPerKind, @ZorgkortingPercentage, @Alimentatiegerechtigde)
```

#### 2.3 UPDATE Query in `updateAlimentatie()` (regel ~207+)

**Toevoegen na de `alimentatiebedragPerKind` check (rond regel 265):**

```typescript
if (data.alimentatiebedragPerKind !== undefined) {
    updateFields.push('alimentatiebedrag_per_kind = @BedragPerKind');
    request.input('BedragPerKind', sql.Decimal(10, 2), data.alimentatiebedragPerKind);
}
if (data.zorgkortingPercentageAlleKinderen !== undefined) {
    updateFields.push('zorgkorting_percentage_alle_kinderen = @ZorgkortingPercentage');
    request.input('ZorgkortingPercentage', sql.Decimal(5, 2), data.zorgkortingPercentageAlleKinderen);
}
if (data.alimentatiegerechtigde !== undefined) {
    updateFields.push('alimentatiegerechtigde = @Alimentatiegerechtigde');
    request.input('Alimentatiegerechtigde', sql.VarChar(255), data.alimentatiegerechtigde);
}
```

**En in de OUTPUT sectie van de UPDATE query:**
```sql
updated.bedragen_alle_kinderen_gelijk as bedragenAlleKinderenGelijk,
updated.alimentatiebedrag_per_kind as alimentatiebedragPerKind,
updated.zorgkorting_percentage_alle_kinderen as zorgkortingPercentageAlleKinderen,
updated.alimentatiegerechtigde
```

---

## Verificatie

### 1. TypeScript Compilatie
```bash
cd /home/hans/ouderschaps-api
npm run build
```

Er mogen geen TypeScript errors zijn.

### 2. Test API Endpoints

**Test GET endpoint:**
```bash
# Test dat het veld wordt teruggestuurd
curl -X GET "https://your-api.azurewebsites.net/api/dossiers/{dossierId}/alimentatie"
```

Verwachte response moet `zorgkortingPercentageAlleKinderen` bevatten:
```json
{
  "alimentatie": {
    "id": 123,
    "dossierId": 456,
    "bedragenAlleKinderenGelijk": true,
    "alimentatiebedragPerKind": 200.00,
    "zorgkortingPercentageAlleKinderen": 15.00,
    "alimentatiegerechtigde": "Marie Jansen"
  }
}
```

**Test POST/PUT endpoints:**
```bash
# Test dat het veld kan worden opgeslagen
curl -X PUT "https://your-api.azurewebsites.net/api/alimentatie/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "bedragenAlleKinderenGelijk": true,
    "alimentatiebedragPerKind": 200,
    "zorgkortingPercentageAlleKinderen": 15,
    "alimentatiegerechtigde": "Marie Jansen"
  }'
```

### 3. Database Verificatie

Controleer dat de waarde correct wordt opgeslagen:
```sql
SELECT
    id,
    bedragen_alle_kinderen_gelijk,
    alimentatiebedrag_per_kind,
    zorgkorting_percentage_alle_kinderen,
    alimentatiegerechtigde
FROM dbo.alimentaties
WHERE id = 123;
```

---

## Samenvatting Wijzigingen

| Bestand | Aantal wijzigingen | Beschrijving |
|---------|-------------------|--------------|
| `src/models/Alimentatie.ts` | 3 regels | Toevoegen aan 3 interfaces |
| `src/services/alimentatie-service.ts` | ~10 regels | SELECT, INSERT, UPDATE queries |

**Totaal:** ~13 regels code toevoegen

---

## Rollback

Als de wijzigingen ongedaan moeten worden gemaakt:
1. Revert de code wijzigingen in git
2. Voer de database rollback uit: `002_rollback_zorgkorting_percentage_alle_kinderen.sql`

---

## Notities

- Het veld is optioneel (`NULL` toegestaan in database)
- Het veld wordt alleen gebruikt wanneer `bedragen_alle_kinderen_gelijk = true`
- De frontend (ouderschaps-web) verwacht dit veld al en is klaar voor gebruik
- De database migratie is al uitgevoerd op Azure SQL Database

---

**Datum:** 2025-11-11
**Auteur:** Claude Code
**Gerelateerde migratie:** 002_add_zorgkorting_percentage_alle_kinderen.sql
