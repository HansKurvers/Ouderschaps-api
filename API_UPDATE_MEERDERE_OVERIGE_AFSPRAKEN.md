# API Update: Meerdere Overige Afspraken

## Wijziging in upsertZorg Endpoint

### Endpoint
`POST /api/dossiers/{dossierId}/zorg/upsert`

### Nieuwe Functionaliteit
Het is nu mogelijk om **meerdere "overige afspraken"** (situatieId: 15) op te slaan voor één dossier.

### Gedrag per Situatie Type

#### Voor situatieId 15 ("Anders"):
- **CREATE** (geen `id` in request): Maakt altijd een nieuw record aan
- **UPDATE** (met `id` in request): Update het specifieke record met dat ID
- Geen limiet op aantal "overige afspraken" per dossier

#### Voor andere situaties (niet 15):
- Behoudt unieke constraint: één record per dossier + situatie combinatie
- Voorkomt duplicates zoals voorheen

### Voorbeeld Request
```json
{
  "zorgregelingen": [
    {
      // Nieuwe overige afspraak (geen id = create)
      "zorgCategorieId": 1,
      "zorgSituatieId": 15,
      "situatieAnders": "Zwemles afspraken",
      "overeenkomst": "Kind gaat elke zaterdag naar zwemles",
      "_tempId": 12345
    },
    {
      // Update bestaande overige afspraak (met id)
      "id": 789,
      "zorgCategorieId": 1,
      "zorgSituatieId": 15,
      "situatieAnders": "Muziekles afspraken",
      "overeenkomst": "Kind heeft pianoles op woensdag",
      "_tempId": 67890
    }
  ]
}
```

### Response
Retourneert alle zorg records voor het dossier, inclusief alle "overige afspraken".

### Frontend Noot
Het `_tempId` veld wordt geaccepteerd maar genegeerd door de backend. De frontend kan dit gebruiken voor het matchen van responses.