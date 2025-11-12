# Frontend Update: Definitieve Template Filtering

## Database Update Compleet ✅

De database structuur is nu volledig geoptimaliseerd met een duidelijk onderscheid tussen Feestdagen en Bijzondere dagen.

## Nieuwe Database Structuur

### Templates per Type:
- **Type = "Algemeen"**: 8 templates (beslissingen/overleg)
- **Type = "Bijzondere dag"**: 58 templates (speciale persoonlijke dagen)
- **Type = "Feestdag"**: 12 templates (algemene feestdagen)
- **Type = "Vakantie"**: 12 templates (schoolvakanties)

### Belangrijke Wijzigingen:
1. ✅ Alle "Eigen tekst invoeren" templates zijn verwijderd
2. ✅ card_tekst kolom is geleegd (gebruik alleen templateTekst)
3. ✅ Bijzondere dagen hebben nu type = "Bijzondere dag" (niet meer "Feestdag")
4. ✅ Normale feestdagen hebben subtype = "algemeen"

## Frontend Filtering Implementatie

### Voor NORMALE FEESTDAGEN (categorie 9):
```javascript
// Filter op type = 'Feestdag'
const templates = await lookupsService.getRegelingenTemplates({
  type: 'Feestdag',
  meervoudKinderen: hasMultipleChildren
});
// Geen extra filtering nodig - backend geeft alleen algemene feestdag templates
```

### Voor BIJZONDERE DAGEN (categorie 10):
```javascript
// Filter op type = 'Bijzondere dag' met optioneel subtype
const subtype = BIJZONDERE_DAGEN_SUBTYPES[situatie.id];

const templates = await lookupsService.getRegelingenTemplates({
  type: 'Bijzondere dag',
  subtype: subtype, // optioneel voor specifieke bijzondere dag
  meervoudKinderen: hasMultipleChildren
});
```

## Situatie ID Mapping

```javascript
const BIJZONDERE_DAGEN_SUBTYPES = {
    33: 'moederdag',
    34: 'vaderdag',
    35: 'verjaardag_kind',
    36: 'verjaardag_partij1',    // Verjaardag ouders
    37: 'verjaardag_partij2',    // Verjaardag grootouders
    38: 'bijzonder_jubileum'
};
```

## API Calls Voorbeelden

### Normale feestdagen (Kerst, Pasen, etc.):
```
GET /api/lookups/regelingen-templates?type=Feestdag&meervoudKinderen=false
```
→ Geeft 6 algemene templates

### Alle bijzondere dagen:
```
GET /api/lookups/regelingen-templates?type=Bijzondere dag&meervoudKinderen=false
```
→ Geeft alle bijzondere dagen templates (29 stuks)

### Specifieke bijzondere dag (bijv. Vaderdag):
```
GET /api/lookups/regelingen-templates?type=Bijzondere dag&subtype=vaderdag&meervoudKinderen=false
```
→ Geeft 5 Vaderdag templates

## Belangrijke Opmerkingen

1. **Geen "Eigen tekst invoeren"**: Deze optie moet de frontend zelf toevoegen indien gewenst
2. **card_tekst is NULL**: Gebruik alleen `templateTekst` voor weergave
3. **Type is leidend**: Filter eerst op type, dan eventueel op subtype

## Test Checklist

- [ ] Kerst selecteren → Alleen algemene feestdag templates (6 stuks)
- [ ] Vaderdag selecteren → Alleen Vaderdag templates (5 stuks)
- [ ] Moederdag selecteren → Alleen Moederdag templates (5 stuks)
- [ ] Geen mix van templates tussen categorieën

## Database Totalen

- **Algemeen**: 8 templates
- **Bijzondere dag**: 58 templates (10 per subtype, behalve verjaardag_kind met 8)
- **Feestdag**: 12 templates (6 enkelvoud + 6 meervoud)
- **Vakantie**: 12 templates (6 enkelvoud + 6 meervoud)
- **Totaal**: 90 templates

---

**Status**: Database volledig geoptimaliseerd en klaar voor gebruik
**Datum**: 2025-11-12