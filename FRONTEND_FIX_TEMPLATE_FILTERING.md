# Frontend Fix: Template Filtering voor Bijzondere Dagen

## Probleem

Bij het selecteren van bijzondere dagen (zoals Vaderdag) worden te veel templates getoond, inclusief:
1. Algemene feestdag templates (die geen subtype hebben)
2. Templates met hardcoded namen zoals "Baps en Marie José"
3. Dubbele entries

## Oorzaak

De frontend haalt waarschijnlijk ALLE Feestdag templates op in plaats van alleen die met het specifieke subtype.

## Oplossing

### 1. Check de API call

Zorg ervoor dat bij bijzondere dagen de API call het subtype parameter bevat:

```javascript
// GOED - voor bijzondere dagen
`/api/lookups/regelingen-templates?type=Feestdag&subtype=vaderdag&meervoudKinderen=${meervoud}`

// GOED - voor normale feestdagen (Kerst, Pasen, etc.)
`/api/lookups/regelingen-templates?type=Feestdag&meervoudKinderen=${meervoud}`
```

### 2. Filter in de frontend

Als de API toch alle templates teruggeeft, filter dan in de frontend:

```javascript
// Voor bijzondere dagen - filter op subtype
const filteredTemplates = templates.filter(t => 
    t.templateSubtype === expectedSubtype
);

// Voor normale feestdagen - filter op GEEN subtype
const filteredTemplates = templates.filter(t => 
    !t.templateSubtype || t.templateSubtype === null
);
```

### 3. Controleer de response

De backend stuurt voor Vaderdag alleen deze 6 templates (+ 6 voor meervoud):
1. {KIND} is op {FEESTDAG} bij {PARTIJ1}
2. {KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}
3. {KIND} is in het weekend van {FEESTDAG} bij {PARTIJ1}
4. {KIND} krijgt de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ1} te zijn
5. Op {FEESTDAG} loopt de zorgregeling volgens schema
6. Eigen tekst invoeren

## Test

1. Selecteer Vaderdag → Moet exact 6 templates tonen (geen Baps/Marie José)
2. Selecteer Kerst → Moet de algemene templates tonen
3. Check dat er geen dubbele "Eigen tekst invoeren" entries zijn

## Database Status

- Backend heeft 82 templates totaal voor type='Feestdag'
- 12 algemene templates (geen subtype) - voor Kerst, Pasen, etc.
- 70 bijzondere dagen templates (met subtype)
- Geen templates met hardcoded namen in database