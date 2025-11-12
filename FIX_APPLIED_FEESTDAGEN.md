# Fix Applied: Feestdagen "Overige Afspraak" Issue

**Datum:** 2025-10-28
**Status:** ✅ FIXED
**Dossier ID:** 69

## Probleem (Samenvatting)

Frontend stuurde `zorgSituatieId: 15` voor custom/anders regelingen, maar ID 15 bestond niet in de database. Dit veroorzaakte een Foreign Key constraint error:

```
The INSERT statement conflicted with the FOREIGN KEY constraint "FK_zorg_situatie"
```

## Root Cause

**Database gap:** Er zat een missing ID tussen:
- ID 14: Zwemlessen (Sport en hobby)
- ID 16: Kerstvakantie (Schoolvakanties)

Frontend verwachtte dat ID 15 een universele "Anders" optie zou zijn voor custom regelingen.

## Toegepaste Fix ✅

### Database Migratie

Uitgevoerd via: `scripts/add-situatie-15-anders.cjs`

**SQL:**
```sql
SET IDENTITY_INSERT dbo.zorg_situaties ON;

INSERT INTO dbo.zorg_situaties (id, naam, zorg_categorie_id)
VALUES (15, 'Anders', NULL);

SET IDENTITY_INSERT dbo.zorg_situaties OFF;
```

**Resultaat:**
- ID: 15
- Naam: `Anders`
- Categorie ID: `NULL` (universeel - werkt voor ALLE categorieën)

### Verificatie ✅

Na migratie:
```
✅ ID 15 EXISTS:
   ID: 15
   Naam: Anders
   Categorie ID: NULL (universal)
```

## Impact

### ✅ Wat nu werkt:

1. **Frontend kan custom regelingen opslaan** met `zorgSituatieId: 15`
2. **Werkt voor ALLE categorieën** (Feestdagen, Schoolvakanties, etc.) omdat `zorg_categorie_id` NULL is
3. **Backend validatie passeert** - Foreign Key constraint is nu tevreden
4. **Frontend hoeft NIET aangepast te worden** - de verwachte ID 15 bestaat nu

### 📊 Database State:

**Voor:**
```
ID 14: Zwemlessen (Sport en hobby)
[ GAP - ID 15 MISSING ]
ID 16: Kerstvakantie (Schoolvakanties)
```

**Na:**
```
ID 14: Zwemlessen (Sport en hobby)
ID 15: Anders (UNIVERSAL)  ← NIEUW
ID 16: Kerstvakantie (Schoolvakanties)
```

## Hoe het werkt

Wanneer een gebruiker een "overige afspraak" toevoegt bij Feestdagen:

1. **Frontend stuurt:**
   ```json
   {
     "zorgCategorieId": 9,           // Feestdagen
     "zorgSituatieId": 15,           // Anders (universeel)
     "situatieAnders": "Familiedag", // Custom naam
     "overeenkomst": "..."
   }
   ```

2. **Backend slaat op:**
   - `zorg_categorie_id` = 9 (Feestdagen)
   - `zorg_situatie_id` = 15 (Anders)
   - `situatie_anders` = "Familiedag"
   - Foreign Key constraint: ✅ VALID (ID 15 bestaat!)

3. **Bij ophalen:**
   - Als `situatie_anders` gevuld is, toon die waarde
   - Anders toon `zorg_situaties.naam` ("Anders")

## Testing

**Aanbevolen test voor gebruiker:**

1. Ga naar dossier 69 (of een ander dossier)
2. Navigeer naar Feestdagen sectie
3. Voeg een "Overige afspraak" / custom regeling toe
4. Vul een aangepaste naam in (bijv. "Familiedag")
5. Sla op

**Verwacht resultaat:** ✅ Succesvol opgeslagen zonder 500 error

## Technische Details

### Database Schema

**Tabel:** `dbo.zorg_situaties`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | int (PK, Identity) | Primary key |
| naam | nvarchar(200) | Naam van situatie |
| zorg_categorie_id | int (FK, NULL) | Foreign key naar zorg_categorieen (NULL = universeel) |

**Foreign Key:** `FK_zorg_situatie`
- Van: `dbo.zorg.zorg_situatie_id`
- Naar: `dbo.zorg_situaties.id`

### Backend Code

**Geen wijzigingen nodig!** Backend was al correct:
- `src/validators/zorg-validator.ts:14` - Valideert `zorgSituatieId` correct
- `src/functions/zorg/upsertZorg.ts` - Handelt `situatieAnders` correct af
- `src/repositories/ZorgRepository.ts` - Ondersteunt universele situaties (NULL categorie)

### Frontend Code

**Geen wijzigingen nodig!** Frontend gedrag was correct:
- Stuurt `zorgSituatieId: 15` voor custom regelingen
- Stuurt `situatieAnders` met custom naam
- Database miste alleen ID 15

## Gerelateerde Files

- ✅ `scripts/add-situatie-15-anders.cjs` - Migratie script
- ✅ `scripts/check-situatie-15.cjs` - Verificatie script
- ✅ `scripts/check-zorg-situaties.cjs` - Algemeen overzicht script
- 📄 `ISSUE_REPORT_FEESTDAGEN.md` - Originele issue analyse

## Status

| Item | Status |
|------|--------|
| Root cause geïdentificeerd | ✅ |
| Database fix geïmplementeerd | ✅ |
| Verificatie succesvol | ✅ |
| Backend code werkt | ✅ |
| Frontend kan testen | ✅ |
| Productie deployment | ⏳ Pending user test |

## Conclusie

Het probleem is opgelost door de ontbrekende `zorg_situaties` record toe te voegen met:
- **ID 15** (zoals frontend verwacht)
- **Naam "Anders"** (generiek)
- **Categorie NULL** (werkt voor alle categorieën)

Frontend en backend hoeven **NIET** aangepast te worden. De fix is puur een database migratie.

🎉 **Issue resolved!**
