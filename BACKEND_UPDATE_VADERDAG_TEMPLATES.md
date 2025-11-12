# Backend Update: Bijzondere Dagen Templates met Subtype

## Overzicht

Een nieuwe functionaliteit is toegevoegd voor het ondersteunen van speciale feestdagen (zoals Vaderdag/Moederdag) met hun eigen unieke template opties.

**Database aanpassingen:**
- Nieuw veld: `template_subtype` in `dbo.regelingen_templates` 
- Type: `NVARCHAR(50) NULL`
- Index toegevoegd voor performance
- 12 Vaderdag templates toegevoegd (6 enkelvoud + 6 meervoud)

**API aanpassingen:**
- Nieuwe query parameter: `subtype` in `/api/lookups/regelingen-templates`
- Backward compatible - bestaande functionaliteit blijft werken

## Implementatie Details

### 1. Database Schema Update

```sql
ALTER TABLE dbo.regelingen_templates
ADD template_subtype NVARCHAR(50) NULL;

CREATE INDEX IX_regelingen_templates_subtype
ON dbo.regelingen_templates(type, template_subtype, meervoud_kinderen, sort_order);
```

### 2. Vaderdag Templates

Voor **enkelvoud** (meervoud_kinderen = 0):
1. `{KIND} is op {FEESTDAG} bij {PARTIJ1}`
2. `{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}`
3. `{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ1}`
4. `{KIND} krijgt de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ1} te zijn`
5. `Op {FEESTDAG} loopt de zorgregeling volgens schema`
6. `Eigen tekst invoeren`

Voor **meervoud** (meervoud_kinderen = 1): Zelfde opties maar met "De kinderen" i.p.v. "{KIND}"

### 3. API Usage

**Normale feestdagen (bestaand):**
```
GET /api/lookups/regelingen-templates?type=Feestdag
```

**Vaderdag specifiek (nieuw):**
```
GET /api/lookups/regelingen-templates?type=Feestdag&subtype=vaderdag
```

**Response bevat nu ook:**
```json
{
    "templateSubtype": "vaderdag",
    "cardTekst": "Korte preview tekst"
}
```

## Frontend Integratie

De frontend moet bij selectie van Vaderdag/Moederdag de subtype parameter meegeven:

```javascript
// Bij selectie van Vaderdag in zorg_situaties
if (situatie.id === VADERDAG_ID) {
    const templates = await fetch('/api/lookups/regelingen-templates?type=Feestdag&subtype=vaderdag');
}

// Voor andere feestdagen
else {
    const templates = await fetch('/api/lookups/regelingen-templates?type=Feestdag');
}
```

## Toekomstige Uitbreidingen

Voor Moederdag kunnen vergelijkbare templates worden toegevoegd:
```sql
INSERT INTO dbo.regelingen_templates (..., template_subtype, ...)
VALUES (..., 'moederdag', ...);
```

Andere speciale dagen kunnen hun eigen subtype krijgen voor unieke template sets.

## Migration Files

- SQL Script: `scripts/004_add_template_subtype_and_vaderdag.sql`
- Runner: `scripts/run-migration-004.cjs`

## Rollback

Om de wijzigingen ongedaan te maken:
1. Verwijder Vaderdag templates: `DELETE FROM dbo.regelingen_templates WHERE template_subtype = 'vaderdag'`
2. Drop index: `DROP INDEX IX_regelingen_templates_subtype ON dbo.regelingen_templates`
3. Drop column: `ALTER TABLE dbo.regelingen_templates DROP COLUMN template_subtype`

---

**Datum:** 2025-11-12  
**Auteur:** Claude Code Backend