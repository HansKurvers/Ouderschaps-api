# Frontend Update: Template Filtering V2

## Database Wijzigingen

De database is geoptimaliseerd:

1. ✅ **Verwijderd**: Alle "Eigen tekst invoeren" templates (12 stuks)
2. ✅ **Toegevoegd**: Subtype "algemeen" voor normale feestdagen  
3. ✅ **Geleegd**: card_tekst kolom (was dubbele data)

## Nieuwe Filtering Strategie

### Database Status:
- **Type**: Alle templates hebben `type = 'Feestdag'` (vanwege database constraint)
- **Subtype**: Is nu de belangrijkste filter:
  - `'algemeen'` = Normale feestdagen (Kerst, Pasen, etc.)
  - `'vaderdag'` = Vaderdag templates
  - `'moederdag'` = Moederdag templates  
  - `'verjaardag_kind'` = Verjaardag kinderen
  - `'verjaardag_partij1'` = Verjaardag ouders
  - `'verjaardag_partij2'` = Verjaardag grootouders
  - `'bijzonder_jubileum'` = Bijzondere jubilea

## Frontend Implementatie

### Voor NORMALE feestdagen (categorie 9):
```javascript
// Filter op subtype = 'algemeen'
const templates = await lookupsService.getRegelingenTemplates({
  type: 'Feestdag',
  meervoudKinderen: hasMultipleChildren
});

// Filter in frontend
const filteredTemplates = templates.filter(t => t.templateSubtype === 'algemeen');
```

### Voor BIJZONDERE dagen (categorie 10):
```javascript
// Filter op specifiek subtype
const subtype = BIJZONDERE_DAGEN_SUBTYPES[situatie.id];
const templates = await lookupsService.getRegelingenTemplates({
  type: 'Feestdag',
  meervoudKinderen: hasMultipleChildren
});

// Filter in frontend
const filteredTemplates = templates.filter(t => t.templateSubtype === subtype);
```

### Alternatief: Update API call
Als de backend API de subtype parameter ondersteunt:
```javascript
// Voor normale feestdagen
?type=Feestdag&subtype=algemeen&meervoudKinderen=true

// Voor bijzondere dagen
?type=Feestdag&subtype=vaderdag&meervoudKinderen=true
```

## Belangrijke Wijzigingen

1. **card_tekst is NULL**: Gebruik alleen `templateTekst`
2. **Geen "Eigen tekst invoeren"**: Deze optie moet de frontend zelf toevoegen indien nodig
3. **Filter op subtype**: Niet meer op aanwezigheid van subtype, maar op specifieke waarde

## Test Scenario's

1. **Kerst (categorie 9)**: 
   - Filter: `templateSubtype === 'algemeen'`
   - Verwacht: 6 templates (3 enkelvoud, 3 meervoud)

2. **Vaderdag (categorie 10, ID 34)**:
   - Filter: `templateSubtype === 'vaderdag'`  
   - Verwacht: 5 templates (geen "Eigen tekst")

3. **Moederdag (categorie 10, ID 33)**:
   - Filter: `templateSubtype === 'moederdag'`
   - Verwacht: 5 templates

## Database Totalen

- **Totaal**: 70 templates (was 102)
- **Per subtype**: ~10 templates (5 enkelvoud + 5 meervoud)
- **Algemeen**: 12 templates (6 + 6)

---

**Datum**: 2025-11-12  
**Status**: Database is aangepast, frontend moet filtering updaten