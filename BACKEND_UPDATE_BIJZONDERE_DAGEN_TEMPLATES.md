# Backend Update: Bijzondere Dagen Templates met Subtype

## Overzicht

Een uitgebreide functionaliteit is toegevoegd voor het ondersteunen van bijzondere dagen met hun eigen unieke template opties per categorie.

**Database aanpassingen:**
- Nieuw veld: `template_subtype` in `dbo.regelingen_templates` 
- Type: `NVARCHAR(50) NULL`
- Index toegevoegd voor performance
- 72 templates toegevoegd voor 6 verschillende bijzondere dagen categorieën

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

### 2. Bijzondere Dagen Templates

**Vaderdag** (subtype: 'vaderdag', situatie ID: 34):
- 6 templates enkelvoud + 6 meervoud
- Focus op tijd met vader ({PARTIJ1})
- Opties: bij vader, met avond ervoor, weekend, deel van dag, volgens schema, eigen tekst

**Moederdag** (subtype: 'moederdag', situatie ID: 33):
- 6 templates enkelvoud + 6 meervoud  
- Focus op tijd met moeder ({PARTIJ2})
- Opties: bij moeder, met avond ervoor, weekend, deel van dag, volgens schema, eigen tekst

**Verjaardag kinderen** (subtype: 'verjaardag_kinderen', situatie ID: 35):
- 6 templates enkelvoud + 6 meervoud
- Opties: volgens schema, met beide ouders, wisselend per jaar, dubbel feest, overleg, eigen tekst

**Verjaardag ouders** (subtype: 'verjaardag_ouders', situatie ID: 36):
- 6 templates enkelvoud + 6 meervoud
- Opties: bezoek beide ouders, hele dag bij jarige, deel van dag, volgens schema, overleg, eigen tekst

**Verjaardag grootouders** (subtype: 'verjaardag_grootouders', situatie ID: 37):
- 6 templates enkelvoud + 6 meervoud
- Opties: beide kanten bezoeken, met betreffende ouder, volgens schema, overleg, eigen keuze kind, eigen tekst

**Bijzondere jubilea** (subtype: 'bijzondere_jubilea', situatie ID: 38):
- 6 templates enkelvoud + 6 meervoud
- Opties: aanwezigheid, per familiekant, overleg, afwijken schema mogelijk, informeren, eigen tekst

### 3. API Usage

**Normale feestdagen (bestaand):**
```
GET /api/lookups/regelingen-templates?type=Feestdag
```

**Bijzondere dagen specifiek (nieuw):**
```
GET /api/lookups/regelingen-templates?type=Feestdag&subtype=vaderdag
GET /api/lookups/regelingen-templates?type=Feestdag&subtype=moederdag
GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_kinderen
GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_ouders
GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_grootouders
GET /api/lookups/regelingen-templates?type=Feestdag&subtype=bijzondere_jubilea
```

**Response bevat nu ook:**
```json
{
    "templateSubtype": "vaderdag",
    "cardTekst": "Korte preview tekst"
}
```

## Frontend Integratie

De frontend moet bij selectie van bijzondere dagen de subtype parameter meegeven:

```javascript
// Mapping van situatie IDs naar subtypes
const BIJZONDERE_DAGEN_SUBTYPES = {
    33: 'moederdag',
    34: 'vaderdag',
    35: 'verjaardag_kinderen',
    36: 'verjaardag_ouders',
    37: 'verjaardag_grootouders',
    38: 'bijzondere_jubilea'
};

// Bij selectie van een bijzondere dag
const subtype = BIJZONDERE_DAGEN_SUBTYPES[situatie.id];
if (subtype) {
    const templates = await fetch(`/api/lookups/regelingen-templates?type=Feestdag&subtype=${subtype}`);
} else {
    // Voor andere feestdagen (Kerst, Pasen, etc.)
    const templates = await fetch('/api/lookups/regelingen-templates?type=Feestdag');
}
```

## Implementatie Status

✅ **Geïmplementeerd:**
- Vaderdag (ID 34): 12 templates
- Moederdag (ID 33): 12 templates  
- Verjaardag kinderen (ID 35): 12 templates
- Verjaardag ouders (ID 36): 12 templates
- Verjaardag grootouders (ID 37): 12 templates
- Bijzondere jubilea (ID 38): 12 templates

**Totaal:** 72 nieuwe templates voor bijzondere dagen

## Migration Files

- SQL Script Vaderdag: `scripts/004_add_template_subtype_and_vaderdag.sql`
- Runner Vaderdag: `scripts/run-migration-004.cjs`
- SQL Script Alle bijzondere dagen: `scripts/005_add_all_bijzondere_dagen_templates.sql`
- Runner Alle bijzondere dagen: `scripts/run-migration-005.cjs`

## Uitvoeren van Migrations

```bash
# Eerst Vaderdag migration (voegt template_subtype kolom toe)
node scripts/run-migration-004.cjs

# Daarna alle andere bijzondere dagen
node scripts/run-migration-005.cjs
```

## Rollback

Om de wijzigingen ongedaan te maken:
1. Verwijder bijzondere dagen templates: `DELETE FROM dbo.regelingen_templates WHERE template_subtype IS NOT NULL`
2. Drop index: `DROP INDEX IX_regelingen_templates_subtype ON dbo.regelingen_templates`
3. Drop column: `ALTER TABLE dbo.regelingen_templates DROP COLUMN template_subtype`

## Template Voorbeelden

### Vaderdag/Moederdag
- "{KIND} is op {FEESTDAG} bij {PARTIJ1/2}"
- "{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1/2}"
- "Op {FEESTDAG} loopt de zorgregeling volgens schema"

### Verjaardagen Kinderen
- "{KIND} viert zijn/haar verjaardag bij degene waar {KIND} op die dag volgens schema is"
- "{KIND} viert zijn/haar verjaardag het ene jaar bij {PARTIJ1} en het andere jaar bij {PARTIJ2}"
- "{KIND} heeft twee verjaardagsfeestjes: één bij {PARTIJ1} en één bij {PARTIJ2}"

### Verjaardagen Ouders/Grootouders
- "{KIND} mag op de verjaardag van beide ouders op bezoek komen"
- "{KIND} bezoekt grootouders samen met de ouder aan wiens kant zij familie zijn"
- "{KIND} mag zelf kiezen of hij/zij de grootouders bezoekt op hun verjaardag"

### Bijzondere Jubilea
- "{KIND} is aanwezig bij bijzondere jubilea van familieleden"
- "Bij bijzondere jubilea kan van het reguliere schema worden afgeweken in overleg"
- "Partijen informeren elkaar tijdig over bijzondere jubilea in de familie"

---

**Datum:** 2025-11-12  
**Auteur:** Claude Code Backend