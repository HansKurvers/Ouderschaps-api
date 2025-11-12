# Frontend Update Request: Bijzondere Dagen Templates

## Voor de Frontend Claude Code

De backend heeft een belangrijke update doorgevoerd voor het ondersteunen van bijzondere dagen met specifieke template opties. Hier is wat je moet implementeren:

## Wat is er veranderd in de Backend

1. **Nieuwe field in API response**: `templateSubtype` 
2. **Nieuwe query parameter**: `subtype` voor het filteren van templates
3. **72 nieuwe templates** voor 6 verschillende bijzondere dagen

## Implementatie Instructies

### 1. Situatie IDs Mapping

```javascript
// Deze bijzondere dagen hebben nu hun eigen templates
const BIJZONDERE_DAGEN_SUBTYPES = {
    33: 'moederdag',          // Moederdag
    34: 'vaderdag',           // Vaderdag  
    35: 'verjaardag_kinderen', // Verjaardag kinderen
    36: 'verjaardag_ouders',   // Verjaardag ouders
    37: 'verjaardag_grootouders', // Verjaardag grootouders
    38: 'bijzondere_jubilea'   // Bijzondere jubilea
};
```

### 2. Template Ophalen Logic

Wanneer een gebruiker een zorg situatie selecteert in categorie 10 (Bijzondere dagen):

```javascript
async function getTemplatesForSituatie(situatie, meervoudKinderen) {
    // Check of deze situatie speciale templates heeft
    const subtype = BIJZONDERE_DAGEN_SUBTYPES[situatie.id];
    
    if (subtype) {
        // Haal specifieke templates op voor deze bijzondere dag
        const response = await fetch(
            `/api/lookups/regelingen-templates?type=Feestdag&subtype=${subtype}&meervoudKinderen=${meervoudKinderen}`
        );
        return response.json();
    } else {
        // Voor andere feestdagen (Kerst, Pasen, etc.) gebruik normale templates
        const response = await fetch(
            `/api/lookups/regelingen-templates?type=Feestdag&meervoudKinderen=${meervoudKinderen}`
        );
        return response.json();
    }
}
```

### 3. Voorbeeld Templates per Bijzondere Dag

**Vaderdag (ID: 34)** - Focus op tijd met vader:
- {KIND} is op {FEESTDAG} bij {PARTIJ1}
- {KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}
- {KIND} is in het weekend van {FEESTDAG} bij {PARTIJ1}
- etc.

**Moederdag (ID: 33)** - Focus op tijd met moeder:
- {KIND} is op {FEESTDAG} bij {PARTIJ2}
- {KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}
- etc.

**Verjaardag kinderen (ID: 35)** - Verschillende vieringsopties:
- {KIND} viert zijn/haar verjaardag bij degene waar {KIND} op die dag volgens schema is
- {KIND} viert zijn/haar verjaardag met beide ouders samen
- {KIND} heeft twee verjaardagsfeestjes: één bij {PARTIJ1} en één bij {PARTIJ2}
- etc.

**Verjaardag ouders (ID: 36)** - Bezoek regelingen:
- {KIND} mag op de verjaardag van beide ouders op bezoek komen
- {KIND} is op de verjaardag van {PARTIJ1}/{PARTIJ2} de hele dag bij de jarige ouder
- etc.

**Verjaardag grootouders (ID: 37)** - Familie bezoek opties:
- {KIND} bezoekt de grootouders van beide kanten op hun verjaardag
- {KIND} bezoekt grootouders samen met de ouder aan wiens kant zij familie zijn
- etc.

**Bijzondere jubilea (ID: 38)** - Flexibele regelingen:
- {KIND} is aanwezig bij bijzondere jubilea van familieleden
- Bij bijzondere jubilea kan van het reguliere schema worden afgeweken in overleg
- etc.

### 4. UI/UX Overwegingen

1. **Dynamische Card Selectie**: Wanneer gebruiker een bijzondere dag selecteert, laad de specifieke templates voor die dag
2. **Loading State**: Toon loading indicator tijdens het ophalen van specifieke templates
3. **Fallback**: Als er geen templates zijn (of fout), gebruik de standaard templates
4. **Card Preview**: Gebruik het `cardTekst` field voor korte preview indien beschikbaar

### 5. Test Scenario's

1. Selecteer Vaderdag → Moet 6 Vaderdag-specifieke templates tonen
2. Selecteer Moederdag → Moet 6 Moederdag-specifieke templates tonen  
3. Selecteer Verjaardag kinderen → Moet 6 verjaardag-specifieke templates tonen
4. Selecteer Kerst (geen subtype) → Moet normale feestdag templates tonen
5. Toggle enkelvoud/meervoud → Templates moeten updaten met juiste teksten

### 6. Backwards Compatibility

- Als `templateSubtype` null is, gedraagt het zich als voorheen
- Oude feestdagen (Kerst, Pasen, etc.) werken nog steeds zonder subtype

## Samenvatting voor Implementatie

1. Voeg de `BIJZONDERE_DAGEN_SUBTYPES` mapping toe
2. Update de template fetch logic om `subtype` parameter mee te geven voor bijzondere dagen
3. Test alle 6 bijzondere dagen categorieën
4. Zorg dat normale feestdagen nog steeds werken zonder subtype

De backend is klaar en getest. Alle API endpoints werken al met de nieuwe subtype parameter.

---

**Contact**: Als je vragen hebt, kan je die via Hans aan mij (Backend Claude) doorgeven.