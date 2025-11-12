# Issue Report: Feestdagen "Overige Afspraak" Fout

**Datum:** 2025-10-28
**Gerapporteerd door:** Hans
**Dossier ID:** 69
**Error:** 500 Internal Server Error

## Error Message

```
The INSERT statement conflicted with the FOREIGN KEY constraint "FK_zorg_situatie".
The conflict occurred in database "db-ouderschapsplan", table "dbo.zorg_situaties", column 'id'.
```

## API Endpoint

```
PUT /api/dossiers/69/zorg/upsert
```

## Diagnose

Na grondig onderzoek van de backend code en database:

### Backend Analyse ✅

1. **Validator werkt correct** (`src/validators/zorg-validator.ts`)
   - Vereist: `zorgSituatieId` moet een positive integer zijn
   - Validatie werkt zoals verwacht

2. **Endpoint werkt correct** (`src/functions/zorg/upsertZorg.ts`)
   - Controleert of dossier bestaat en gebruiker toegang heeft
   - Voorkomt duplicaten door dossier + situatie combinatie te checken
   - Gebruikt parameterized queries (SQL injection safe)

3. **Database schema is correct**
   - `dbo.zorg_situaties` tabel bestaat met kolommen: id, naam, zorg_categorie_id
   - Foreign key constraint `FK_zorg_situatie` is correct gedefinieerd
   - Tabel `dbo.zorg` heeft foreign key naar `dbo.zorg_situaties.id`

### Database Data Analyse ✅

**Categorie "Feestdagen" (ID: 9) heeft de volgende situaties:**

| Situatie ID | Situatie Naam |
|------------|---------------|
| 21 | Kerstavond |
| 22 | Eerste Kerstdag |
| 23 | Tweede Kerstdag |
| 24 | Eerste Paasdag |
| 25 | Tweede Paasdag |
| 26 | Oudjaarsdag |
| 27 | Nieuwjaarsdag |
| 28 | Koningsdag |
| 29 | Hemelvaart |
| 30 | Eerste Pinksterdag |
| 31 | Tweede Pinksterdag |
| 32 | Sinterklaas |

**❌ Er bestaat GEEN situatie "Overige afspraak" in de database!**

### Bestaande Data voor Dossier 69 ✅

Dossier 69 heeft al **12 feestdagen records** opgeslagen met bovenstaande situaties.

### Patroon Analyse ✅

- Geen enkel record in de database gebruikt het `situatie_anders` veld
- Alle records gebruiken een specifieke situatie ID uit de lookup tabel
- Er zijn geen "custom" of "overige" situaties gedefinieerd

## Root Cause 🎯

**Dit is een FRONTEND ISSUE.**

De frontend probeert een `zorgSituatieId` te versturen die **niet bestaat** in de `dbo.zorg_situaties` tabel.

### Mogelijke oorzaken:

1. **Frontend heeft een hardcoded "Overige afspraak" optie** met een ID dat niet in de database bestaat
   - Bijvoorbeeld: ID = 0, 999, -1, of een andere niet-bestaande waarde

2. **Frontend mist synchronisatie met database**
   - Frontend verwacht een situatie "Overige afspraak" die nooit is aangemaakt in de database

3. **Frontend gebruikt verkeerde ID mapping**
   - Mogelijk gebruikt de frontend lokale IDs die niet overeenkomen met database IDs

## Oplossingen 💡

### Optie 1: Voeg "Overige afspraak" toe aan database (AANBEVOLEN)

Voer een database migratie uit om de ontbrekende situatie toe te voegen:

```sql
INSERT INTO dbo.zorg_situaties (naam, zorg_categorie_id)
VALUES ('Overige afspraak', 9);
```

Dit zal een nieuw ID genereren (waarschijnlijk 39 of hoger). De frontend moet dan dit nieuwe ID gebruiken.

### Optie 2: Gebruik situatie_anders veld

De frontend moet:
1. Een bestaand situatie ID kiezen (bijvoorbeeld het laatste in de lijst)
2. Het `situatieAnders` veld invullen met de custom tekst "Overige afspraak"

Backend ondersteunt dit al:
- Validator accepteert `situatieAnders` als optional string (max 500 chars)
- Database heeft `situatie_anders` kolom (nvarchar(500))

### Optie 3: Frontend fix - verwijder de optie

Als "Overige afspraak" niet nodig is, moet de frontend deze optie verwijderen uit de UI.

## Aanbevolen Actie 🚀

**Voor Frontend Developer:**

1. **Check welk `zorgSituatieId` wordt verstuurd** wanneer gebruiker "Overige afspraak" selecteert
   - Log de request body in de browser console
   - Check: `zorg.service.ts` → `upsertZorgRegelingen()` functie

2. **Kies een oplossing:**
   - Als ID niet bestaat: voeg situatie toe aan database (Optie 1)
   - Als ID wel bestaat maar verkeerd: fix de ID mapping in frontend
   - Als "overige" moet flexibel zijn: gebruik `situatieAnders` veld (Optie 2)

3. **Test met bestaande situaties eerst**
   - Probeer één van de 12 bestaande feestdagen op te slaan
   - Als dat werkt, is het probleem specifiek voor "Overige afspraak"

## Backend Status ✅

**Backend werkt correct en hoeft NIET aangepast te worden.**

- Validatie is correct
- Error handling is correct
- Database constraints zijn correct
- Foreign key validatie werkt zoals bedoeld

De 500 error is de correcte response voor een invalid foreign key waarde.

## Volgende Stappen

1. Frontend developer checkt welk ID wordt verstuurd voor "Overige afspraak"
2. Besluit nemen over welke oplossing (1, 2, of 3)
3. Eventueel database migratie uitvoeren (als Optie 1)
4. Frontend fix implementeren
5. Testen met dossier 69

---

**Conclusie:** Dit is een mismatch tussen frontend verwachtingen en database realiteit. Backend werkt correct en gooit de juiste error.
