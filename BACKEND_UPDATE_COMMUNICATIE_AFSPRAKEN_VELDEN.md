# Backend Update: Communicatie Afspraken - Nieuwe Velden

**Datum:** 2025-11-22
**Type:** Database & Backend Update
**Status:** Klaar voor implementatie

## Overzicht

Dit document beschrijft de wijzigingen die nodig zijn voor de backend om twee nieuwe velden in de communicatie afspraken te ondersteunen:

1. **villa_pinedo_kinderen** - Vervangt/vult aan op het oude `villa_pinedo` boolean veld met een string veld
2. **kinderen_betrokkenheid** - Nieuw veld om vast te leggen hoe kinderen betrokken zijn bij het ouderschapsplan

## 1. Database Wijzigingen

### SQL Migration Script

Locatie: `scripts/007_add_communicatie_afspraken_velden.sql`

Het script voegt twee nieuwe kolommen toe aan de `dbo.communicatie_afspraken` tabel:

```sql
-- Nieuwe kolom: kinderen_betrokkenheid
ALTER TABLE dbo.communicatie_afspraken
ADD kinderen_betrokkenheid NVARCHAR(50) NULL;

-- Nieuwe kolom: villa_pinedo_kinderen
ALTER TABLE dbo.communicatie_afspraken
ADD villa_pinedo_kinderen NVARCHAR(10) NULL;
```

### Data Migratie

Het migration script bevat ook code om bestaande `villa_pinedo` boolean waarden te migreren naar het nieuwe `villa_pinedo_kinderen` string veld:

- `TRUE` → `'ja'`
- `FALSE` → `'nee'`
- `NULL` → `NULL`

**Belangrijk:** Het oude `villa_pinedo` veld blijft bestaan voor backwards compatibility en kan later handmatig verwijderd worden.

### Nieuwe Kolom Details

| Kolom Naam | Type | Nullable | Beschrijving |
|------------|------|----------|--------------|
| `villa_pinedo_kinderen` | NVARCHAR(10) | YES | Informatie Villa Pinedo aan kinderen gegeven: "ja" of "nee" |
| `kinderen_betrokkenheid` | NVARCHAR(50) | YES | Hoe kinderen betrokken zijn: "samen", "los_van_elkaar", "jonge_leeftijd", "niet_betrokken" |

## 2. Backend Model Wijzigingen

### Bestand: `src/models/CommunicatieAfspraken.ts`

Drie interfaces zijn bijgewerkt:

```typescript
export interface CommunicatieAfspraken {
    // ... bestaande velden ...
    villaPinedo?: boolean | null; // @deprecated - Use villaPinedoKinderen instead
    villaPinedoKinderen?: string | null; // "ja" | "nee"
    kinderenBetrokkenheid?: string | null; // "samen" | "los_van_elkaar" | "jonge_leeftijd" | "niet_betrokken"
    // ... rest van velden ...
}

export interface CreateCommunicatieAfsprakenDto {
    // ... bestaande velden ...
    villaPinedo?: boolean; // @deprecated - Use villaPinedoKinderen instead
    villaPinedoKinderen?: string;
    kinderenBetrokkenheid?: string;
    // ... rest van velden ...
}

export interface UpdateCommunicatieAfsprakenDto {
    // ... bestaande velden ...
    villaPinedo?: boolean; // @deprecated - Use villaPinedoKinderen instead
    villaPinedoKinderen?: string;
    kinderenBetrokkenheid?: string;
    // ... rest van velden ...
}
```

**Opmerking:** Het oude `villaPinedo` veld is gemarkeerd als `@deprecated` maar blijft bestaan voor backwards compatibility.

## 3. Backend Service Wijzigingen

### Bestand: `src/services/communicatie-afspraken-service.ts`

#### 3.1 SELECT Queries (getByDossierId & getById)

Beide SELECT queries zijn bijgewerkt om de nieuwe kolommen op te halen:

```typescript
SELECT
    id,
    dossier_id as dossierId,
    villa_pinedo as villaPinedo,
    villa_pinedo_kinderen as villaPinedoKinderen,        // NIEUW
    kinderen_betrokkenheid as kinderenBetrokkenheid,     // NIEUW
    kies_methode as kiesMethode,
    // ... rest van kolommen ...
FROM dbo.communicatie_afspraken
```

#### 3.2 INSERT Query (create method)

De INSERT query is uitgebreid met de nieuwe velden:

**Input parameters toegevoegd:**
```typescript
.input('VillaPinedoKinderen', sql.NVarChar(10), data.villaPinedoKinderen || null)
.input('KinderenBetrokkenheid', sql.NVarChar(50), data.kinderenBetrokkenheid || null)
```

**INSERT kolommen bijgewerkt:**
```sql
INSERT INTO dbo.communicatie_afspraken
(dossier_id, villa_pinedo, villa_pinedo_kinderen, kinderen_betrokkenheid,
 kies_methode, ...)
```

**OUTPUT clause bijgewerkt:**
```sql
OUTPUT
    inserted.villa_pinedo_kinderen as villaPinedoKinderen,
    inserted.kinderen_betrokkenheid as kinderenBetrokkenheid,
    ...
```

**VALUES bijgewerkt:**
```sql
VALUES (@DossierId, @VillaPinedo, @VillaPinedoKinderen, @KinderenBetrokkenheid,
        @KiesMethode, ...)
```

#### 3.3 UPDATE Query (update method)

De UPDATE query is uitgebreid met conditionale updates voor de nieuwe velden:

```typescript
if (data.villaPinedoKinderen !== undefined) {
    updateFields.push('villa_pinedo_kinderen = @VillaPinedoKinderen');
    request.input('VillaPinedoKinderen', sql.NVarChar(10), data.villaPinedoKinderen);
}
if (data.kinderenBetrokkenheid !== undefined) {
    updateFields.push('kinderen_betrokkenheid = @KinderenBetrokkenheid');
    request.input('KinderenBetrokkenheid', sql.NVarChar(50), data.kinderenBetrokkenheid);
}
```

**OUTPUT clause bijgewerkt:**
```sql
OUTPUT
    inserted.villa_pinedo_kinderen as villaPinedoKinderen,
    inserted.kinderen_betrokkenheid as kinderenBetrokkenheid,
    ...
```

## 4. Frontend Context

De frontend stuurt de volgende waarden voor deze velden:

### villa_pinedo_kinderen
- **Type:** String
- **Waarden:** `"ja"` | `"nee"`
- **UI:** Select dropdown met "Ja" en "Nee" opties
- **Vraag:** "Informatie Villa Pinedo aan kinderen"

### kinderen_betrokkenheid
- **Type:** String
- **Waarden:**
  - `"samen"` - Wij hebben samen met kinderen gesproken
  - `"los_van_elkaar"` - Wij hebben los van elkaar met kinderen gesproken
  - `"jonge_leeftijd"` - Kinderen zijn gezien de jonge leeftijd niet betrokken
  - `"niet_betrokken"` - Kinderen zijn niet betrokken
- **UI:** Select dropdown met 4 opties
- **Vraag:** "Hoe zijn kinderen betrokken bij het opstellen van het ouderschapsplan?"

## 5. Implementatie Stappen

1. **Database Migration Uitvoeren**
   ```bash
   # Verbind met de database en voer uit:
   sqlcmd -S <server> -d <database> -i scripts/007_add_communicatie_afspraken_velden.sql
   ```

2. **Backend Code Deployen**
   - Commit de wijzigingen in `src/models/CommunicatieAfspraken.ts`
   - Commit de wijzigingen in `src/services/communicatie-afspraken-service.ts`
   - Deploy de backend applicatie

3. **Verificatie**
   - Test het aanmaken van nieuwe communicatie afspraken met de nieuwe velden
   - Test het updaten van bestaande communicatie afspraken
   - Controleer of de oude `villaPinedo` waarden correct zijn gemigreerd

## 6. Backwards Compatibility

- Het oude `villa_pinedo` boolean veld blijft bestaan in de database
- Het oude veld is gemarkeerd als `@deprecated` in de TypeScript interfaces
- Bestaande API consumers die het oude veld gebruiken blijven werken
- Nieuwe code moet het nieuwe `villaPinedoKinderen` veld gebruiken

## 7. Toekomstige Cleanup

Na succesvolle migratie en verificatie kan het oude `villa_pinedo` veld verwijderd worden:

```sql
-- NA VOLLEDIGE MIGRATIE EN VERIFICATIE:
ALTER TABLE dbo.communicatie_afspraken DROP COLUMN villa_pinedo;
```

Verwijder daarna ook de `villaPinedo` velden uit de TypeScript interfaces.

## 8. Testing Checklist

- [ ] Migration script succesvol uitgevoerd
- [ ] Nieuwe communicatie afspraken aanmaken met nieuwe velden werkt
- [ ] Bestaande communicatie afspraken updaten met nieuwe velden werkt
- [ ] GET endpoints retourneren de nieuwe velden correct
- [ ] Data migratie van `villa_pinedo` naar `villa_pinedo_kinderen` is correct
- [ ] Frontend kan de nieuwe velden opslaan en ophalen
- [ ] Backwards compatibility met oude `villaPinedo` veld is getest

## 9. Gerelateerde Bestanden

### Backend
- `scripts/007_add_communicatie_afspraken_velden.sql`
- `src/models/CommunicatieAfspraken.ts`
- `src/services/communicatie-afspraken-service.ts`

### Frontend
- `src/components/CommunicatieAfsprakenStep.tsx`
- `src/types/api.types.ts`
- `src/services/communicatieAfspraken.service.ts`

## 10. Contact

Voor vragen over deze update, neem contact op met het development team.

---

**Status:** ✅ Gereed voor implementatie
**Laatst bijgewerkt:** 2025-11-22
