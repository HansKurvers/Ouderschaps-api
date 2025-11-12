# URGENT: Frontend Fix Template Filtering

## Probleem

Bij het selecteren van feestdagen worden verkeerde templates getoond:
- Bij **normale feestdagen** (Kerst, Pasen): worden ook Vaderdag/Moederdag templates getoond
- Bij **Vaderdag/Moederdag**: worden ook algemene feestdag templates getoond

## Oplossing

De API call moet verschillend zijn voor normale feestdagen vs bijzondere dagen:

### Voor NORMALE feestdagen (Kerst, Pasen, Sinterklaas, etc.)
```javascript
// Alleen templates ZONDER subtype ophalen
const url = `/api/lookups/regelingen-templates?type=Feestdag&meervoudKinderen=${meervoud}`;

// OF filter in frontend:
const filteredTemplates = templates.filter(t => !t.templateSubtype);
```

### Voor BIJZONDERE dagen (Vaderdag, Moederdag, etc.)
```javascript
// Alleen templates MET specifiek subtype ophalen
const url = `/api/lookups/regelingen-templates?type=Feestdag&subtype=${subtype}&meervoudKinderen=${meervoud}`;

// OF filter in frontend:
const filteredTemplates = templates.filter(t => t.templateSubtype === expectedSubtype);
```

## Implementatie in ZorgRegelingenStep.tsx

Pas de `openTemplateModal` functie aan:

```javascript
const openTemplateModal = async (omschrijving: string, situatie: any) => {
  // ... existing code ...

  // Voor bijzondere dagen (categorie 10)
  if (situatie.categorie_id === 10) {
    const subtype = BIJZONDERE_DAGEN_SUBTYPES[situatie.id];
    if (subtype) {
      // Haal ALLEEN templates met dit subtype
      url = `/api/lookups/regelingen-templates?type=Feestdag&subtype=${subtype}&meervoudKinderen=${hasMultipleChildren}`;
    }
  } 
  // Voor normale feestdagen (categorie 9)
  else if (situatie.categorie_id === 9) {
    // Haal ALLEEN templates ZONDER subtype
    // Backend moet dit ondersteunen, anders filter in frontend:
    url = `/api/lookups/regelingen-templates?type=Feestdag&meervoudKinderen=${hasMultipleChildren}`;
    
    // Na ophalen, filter templates zonder subtype:
    const response = await lookupsService.getRegelingenTemplates({
      type: 'Feestdag',
      meervoudKinderen: hasMultipleChildren
    });
    
    // BELANGRIJK: Filter alleen templates zonder subtype
    const filteredTemplates = response.filter(t => !t.templateSubtype);
    setModalTemplates(filteredTemplates);
    return;
  }
  
  // ... rest of code ...
};
```

## Test Scenario's

1. **Selecteer Kerst (categorie 9)**
   - Moet 6 algemene templates tonen
   - GEEN Vaderdag/Moederdag templates

2. **Selecteer Vaderdag (categorie 10, ID 34)**
   - Moet 6 Vaderdag-specifieke templates tonen
   - GEEN algemene feestdag templates

3. **Selecteer Pasen (categorie 9)**
   - Moet 6 algemene templates tonen
   - GEEN bijzondere dagen templates

## Database Info

- **Categorie 9 (Feestdagen)**: Kerst, Pasen, Sinterklaas, etc.
  - Templates hebben `template_subtype = NULL`
  
- **Categorie 10 (Bijzondere dagen)**: Vaderdag, Moederdag, Verjaardagen, etc.
  - Templates hebben `template_subtype = 'vaderdag'`, `'moederdag'`, etc.