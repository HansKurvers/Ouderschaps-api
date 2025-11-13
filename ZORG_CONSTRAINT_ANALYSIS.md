# Zorg Database Constraint Analysis: "Overige Afspraken" Limitation

## Executive Summary

The zorg table has a **unique constraint on the combination of `(dossier_id, zorg_situatie_id)`** that prevents multiple "overige afspraken" (other arrangements) per dossier. This is enforced in the `upsertZorg` function, not at the database level.

## The Constraint

### Location
- **File**: `/src/functions/zorg/upsertZorg.ts`
- **Lines**: 68-73

### Implementation
```typescript
// First check if a record exists for this dossier + situatie combination
const existingQuery = `
    SELECT id 
    FROM dbo.zorg 
    WHERE dossier_id = @dossierId 
    AND zorg_situatie_id = @situatieId
`;
```

### Effect
- Each dossier can only have **ONE** zorg record per situatie ID
- When situatieId 15 ("Anders") is used, only **ONE** "overige afspraak" can exist per dossier
- Subsequent attempts to add another "Anders" record will **UPDATE** the existing one instead of creating a new one

## Situatie ID 15 Details

Based on the script analysis:
- **ID**: 15
- **Name**: "Anders" (Other)
- **Category ID**: NULL (universal - can be used with any category)
- **Purpose**: Allow custom/other arrangements that don't fit predefined situations

## Current Behavior

When a user tries to add multiple "overige afspraken":
1. First "Anders" record is created successfully
2. Second "Anders" attempt finds existing record with situatieId=15
3. Instead of creating new record, it **updates** the existing one
4. User loses the first "overige afspraak" content

## Impact

This constraint makes sense for predefined situations (e.g., only one "50/50 verdeling" arrangement), but is problematic for "Anders" because:
- Users may have multiple custom arrangements that don't fit predefined categories
- Each "overige afspraak" might cover different aspects (e.g., one for special holidays, another for medical decisions)
- Current implementation forces all custom arrangements into a single text field

## Possible Solutions

### 1. Remove Constraint for "Anders" (Recommended)
Modify `upsertZorg.ts` to allow multiple records when situatieId=15:

```typescript
// Skip duplicate check for "Anders" situatie (ID 15)
if (zorgData.zorgSituatieId !== 15) {
    const existingQuery = `...`;
    // existing logic
} else {
    // Always create new record for "Anders"
    const created = await zorgRepository.create({...});
}
```

### 2. Add Multiple "Anders" Situaties
Create additional situatie records like:
- ID 15: "Anders 1"
- ID 16: "Anders 2"
- ID 17: "Anders 3"

This maintains the constraint but allows multiple custom arrangements.

### 3. Add a Separate Table
Create a new table `dbo.zorg_overige` specifically for custom arrangements without the unique constraint.

### 4. Add Composite Unique Constraint
Include additional field in uniqueness check (e.g., `overeenkomst` hash) to allow multiple "Anders" with different content.

## Recommendation

**Solution 1** is recommended as it:
- Requires minimal code changes
- Maintains backward compatibility
- Preserves constraint for standard situations
- Allows flexibility for custom arrangements
- Aligns with user expectations

## Related Files
- `/src/functions/zorg/upsertZorg.ts` - Contains the constraint logic
- `/src/repositories/ZorgRepository.ts` - Repository implementation
- `/scripts/check-duplicate-zorg.sql` - SQL to find duplicate records
- `/scripts/cleanup-duplicate-zorg.sql` - SQL to clean duplicates
- `/scripts/add-situatie-15-anders.cjs` - Script that added "Anders" situatie