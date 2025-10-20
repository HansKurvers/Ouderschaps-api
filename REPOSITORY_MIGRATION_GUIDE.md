# Repository Pattern Migration Guide

## Overview

This guide documents the migration from monolithic `DossierDatabaseService` to the Repository Pattern using the **Strangler Fig Pattern**. This allows gradual migration without breaking existing functionality.

## Current State

### Before Migration
- **Single monolithic class**: `DossierDatabaseService` (2981 lines)
- **Mixed responsibilities**: Dossiers, Personen, Kinderen, Omgang, Zorg, Alimentatie, Ouderschapsplan, Lookups
- **All Azure Functions** depend on this single service

### Target State
- **Domain-specific repositories**: One repository per domain entity
- **Single Responsibility**: Each repository handles one entity type
- **Better testability**: Focused, mockable repositories
- **Improved maintainability**: Smaller, focused classes

## Migration Strategy: Strangler Fig Pattern

The Strangler Fig Pattern allows us to:
1. ✅ Keep existing code working
2. ✅ Add new repositories alongside old service
3. ✅ Gradually migrate functions one by one
4. ✅ Test thoroughly at each step
5. ✅ Remove old service only when fully migrated

### Benefits
- **Zero downtime**: Old and new code coexist
- **Reduced risk**: Each migration is small and reversible
- **Incremental testing**: Test each migration separately
- **Team flexibility**: Multiple developers can work in parallel

## Architecture

### New Structure

```
src/
├── repositories/
│   ├── base/
│   │   └── BaseRepository.ts           # Abstract base with CRUD utilities
│   ├── DossierRepository.ts            # ✅ IMPLEMENTED (14 tests)
│   ├── PersoonRepository.ts            # ✅ IMPLEMENTED (23 tests)
│   ├── PartijRepository.ts             # 🔄 TODO
│   ├── KindRepository.ts               # 🔄 TODO
│   ├── OmgangRepository.ts             # 🔄 TODO
│   ├── ZorgRepository.ts               # 🔄 TODO
│   ├── AlimentatieRepository.ts        # 🔄 TODO
│   ├── OuderschapsplanRepository.ts    # 🔄 TODO
│   └── LookupRepository.ts             # 🔄 TODO
├── services/
│   └── database-service.ts             # ⚠️ LEGACY - Keep until fully migrated
```

### BaseRepository

All repositories extend `BaseRepository` which provides:

```typescript
abstract class BaseRepository {
    protected async getPool(): Promise<sql.ConnectionPool>
    protected async executeQuery<T>(query: string, params?: Record<string, any>): Promise<sql.IResult<T>>
    protected async querySingle<T>(query: string, params?: Record<string, any>): Promise<T | null>
    protected async queryMany<T>(query: string, params?: Record<string, any>): Promise<T[]>
    protected async exists(query: string, params?: Record<string, any>): Promise<boolean>
    protected async beginTransaction(): Promise<sql.Transaction>
    protected async executeInTransaction<T>(transaction: sql.Transaction, query: string, params?: Record<string, any>): Promise<sql.IResult<T>>
}
```

## Feature Flag System

Use environment variable `USE_REPOSITORY_PATTERN` to control migration:

```bash
# .env
USE_REPOSITORY_PATTERN=true   # Use new repositories
USE_REPOSITORY_PATTERN=false  # Use legacy service (default)
```

### Function Migration Pattern

Each function should support both old and new patterns:

```typescript
// Example: src/functions/dossiers/createDossier.ts
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function createDossier(request: HttpRequest, context: InvocationContext) {
    context.log(`Using ${USE_REPOSITORY_PATTERN ? 'Repository Pattern' : 'Legacy Service'}`);

    const userId = await requireAuthentication(request);

    let newDossier;

    if (USE_REPOSITORY_PATTERN) {
        // NEW: Use Repository Pattern
        const repository = new DossierRepository();
        newDossier = await repository.create(userId);
    } else {
        // LEGACY: Use old DossierDatabaseService
        const service = new DossierDatabaseService();
        await service.initialize();
        try {
            newDossier = await service.createDossier(userId);
        } finally {
            await service.close();
        }
    }

    return createSuccessResponse(newDossier, 201);
}
```

## Migration Progress

### Phase 1: Foundation ✅ COMPLETED
- [x] Create `BaseRepository` abstract class
- [x] Implement `DossierRepository` as proof of concept
- [x] Migrate `createDossier` function with feature flag
- [x] Write comprehensive tests for `DossierRepository` (14 tests)
- [x] Document migration strategy

### Phase 2: Core Domains ✅ COMPLETED
- [x] Implement `PersoonRepository` (23 tests passing)
- [x] Extended with user-scoped methods (findByIdForUser, createForUser, updateForUser, deleteForUser, etc.)
- [x] Migrate person-related functions with feature flags:
  - [x] createPersoon.ts
  - [x] getPersoonById.ts
  - [x] updatePersoon.ts
  - [x] deletePersoon.ts
- [ ] Implement `PartijRepository` (dossier-persoon linking)
- [ ] Implement `KindRepository` (children + parent-child relations)
- [ ] Write tests for each repository

### Phase 3: Extended Domains
- [ ] Implement `OmgangRepository` (visitation schedules)
- [ ] Implement `ZorgRepository` (care arrangements)
- [ ] Implement `AlimentatieRepository` (child support)
- [ ] Implement `OuderschapsplanRepository` (parenting plans)
- [ ] Migrate related functions
- [ ] Write tests

### Phase 4: Lookups & Utilities
- [ ] Implement `LookupRepository` (rollen, dagen, etc.)
- [ ] Migrate lookup functions
- [ ] Write tests

### Phase 5: Cleanup
- [ ] Enable `USE_REPOSITORY_PATTERN=true` by default
- [ ] Test all functions with new repositories
- [ ] Remove feature flags from all functions
- [ ] Delete `DossierDatabaseService`
- [ ] Update documentation

## Repository Responsibilities

| Repository | Methods | Lines (est.) |
|------------|---------|--------------|
| **DossierRepository** ✅ | `findByUserId`, `findById`, `checkAccess`, `create`, `updateStatus`, `updateAnonymity`, `delete`, `generateNextDossierNumber` | 330 |
| **PersoonRepository** ✅ | `findById`, `findAll`, `findByEmail`, `findByAchternaam`, `checkEmailUnique`, `create`, `update`, `delete`, `count`, **USER-SCOPED:** `findByIdForUser`, `createForUser`, `updateForUser`, `deleteForUser`, `checkEmailUniqueForUser`, `findAllForUser`, `countForUser` | 628 |
| **PartijRepository** | `findByDossierId`, `create`, `delete`, `exists`, `updateRol` | ~150 |
| **KindRepository** | `findByDossierId`, `addToDossier`, `removeFromDossier`, `getOuders`, `addOuder`, `updateOuderRelatie`, `removeOuder` | ~250 |
| **OmgangRepository** | `findByDossierId`, `create`, `update`, `delete`, `createBatch`, `upsertWeek` | ~200 |
| **ZorgRepository** | `findByDossierId`, `create`, `update`, `delete` | ~120 |
| **AlimentatieRepository** | `findByDossierId`, `create`, `update`, `upsert`, `getBijdrageKosten`, `getFinancieleAfspraken` | ~200 |
| **OuderschapsplanRepository** | `findByDossierId`, `findByPersoonId`, `create`, `update`, `delete`, `upsert` | ~150 |
| **LookupRepository** | `getRollen`, `getRelatieTypes`, `getDagen`, `getDagdelen`, `getWeekRegelingen`, `getZorgCategorieen`, `getZorgSituaties`, `getSchoolvakanties`, `getRegelingenTemplates` | ~200 |

**Total**: ~1,750 lines (vs 2,981 lines in monolith) - 41% reduction

## Testing Strategy

### Unit Tests
Each repository should have comprehensive unit tests:

```typescript
describe('DossierRepository', () => {
    // Mock database.getPool()
    // Test all methods
    // Test error handling
    // Test edge cases
});
```

**Example**: `src/tests/repositories/DossierRepository.test.ts` (14 tests, all passing ✅)

### Integration Tests
Test functions with both old and new implementations:

```bash
# Test with legacy service
USE_REPOSITORY_PATTERN=false npm test

# Test with new repository
USE_REPOSITORY_PATTERN=true npm test
```

### Regression Testing
Before removing old service:
1. Run all tests with `USE_REPOSITORY_PATTERN=false`
2. Run all tests with `USE_REPOSITORY_PATTERN=true`
3. Compare results - must be identical
4. Test manually in development environment

## How to Migrate a Function

### Step-by-step Process

1. **Identify Repository Methods Needed**
   ```typescript
   // Example: function needs these methods
   service.getDossierById(dossierId)
   service.checkDossierAccess(dossierId, userId)
   ```

2. **Check if Repository Exists**
   - If yes: Use existing repository
   - If no: Implement repository first

3. **Add Feature Flag**
   ```typescript
   const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';
   ```

4. **Implement Dual Code Path**
   ```typescript
   if (USE_REPOSITORY_PATTERN) {
       // NEW: Repository Pattern
       const repo = new DossierRepository();
       result = await repo.findById(dossierId);
   } else {
       // LEGACY: Old Service
       const service = new DossierDatabaseService();
       await service.initialize();
       try {
           result = await service.getDossierById(dossierId);
       } finally {
           await service.close();
       }
   }
   ```

5. **Test Both Paths**
   ```bash
   # Test legacy
   USE_REPOSITORY_PATTERN=false npm test -- myFunction.test.ts

   # Test new
   USE_REPOSITORY_PATTERN=true npm test -- myFunction.test.ts
   ```

6. **Update Function Tests**
   - Mock both old service and new repository
   - Test both code paths

7. **Document Migration**
   - Update this guide with migrated function
   - Mark repository method as used

## Common Patterns

### Pattern 1: Simple CRUD
```typescript
// OLD
const dossier = await service.getDossierById(dossierId);

// NEW
const dossier = await repository.findById(dossierId);
```

### Pattern 2: Create with Generated Values
```typescript
// OLD
const dossier = await service.createDossier(userId);
// generates dossier number internally

// NEW
const dossier = await repository.create(userId);
// same behavior - generates number internally
```

### Pattern 3: Access Control
```typescript
// OLD
const hasAccess = await service.checkDossierAccess(dossierId, userId);

// NEW
const hasAccess = await repository.checkAccess(dossierId, userId);
```

### Pattern 4: Complex Queries with Joins
```typescript
// OLD
const partijen = await service.getPartijen(dossierId);

// NEW
const partijen = await partijRepository.findByDossierId(dossierId);
```

## Database Mappers

Use existing `DbMappers` utility for consistency:

```typescript
import { DbMappers } from '../utils/db-mappers';

// In repository
const records = await this.queryMany(query, params);
return records.map(DbMappers.toDossier);
```

## Error Handling

Repositories should throw meaningful errors:

```typescript
// Good
if (!record) {
    throw new Error(`Dossier with ID ${dossierId} not found`);
}

// Better - use domain-specific errors (future enhancement)
if (!record) {
    throw new DossierNotFoundError(dossierId);
}
```

## Performance Considerations

1. **Connection Pooling**: BaseRepository uses shared pool (no change)
2. **No Initialize/Close**: Repositories don't need `initialize()` or `close()`
3. **Same Queries**: Use identical SQL queries as old service
4. **Transaction Support**: BaseRepository provides transaction methods

## Rollback Plan

If issues arise:

1. **Immediate Rollback**:
   ```bash
   USE_REPOSITORY_PATTERN=false
   ```

2. **Per-Function Rollback**:
   - Revert feature flag code in specific function
   - Keep repository code for future use

3. **Full Rollback**:
   - Set `USE_REPOSITORY_PATTERN=false` globally
   - All functions fall back to old service
   - No code changes needed

## Benefits Realized

### Code Organization
- ✅ Single Responsibility: Each repository has one clear purpose
- ✅ Better Navigation: Easy to find domain-specific logic
- ✅ Reduced Complexity: Smaller, focused classes

### Testability
- ✅ Easier Mocking: Mock only what you need
- ✅ Faster Tests: Less setup, more focused
- ✅ Better Coverage: Test repositories independently

### Maintainability
- ✅ Easier Changes: Modify one domain without affecting others
- ✅ Clear Dependencies: Explicit repository usage
- ✅ Better Debugging: Smaller surface area

### Team Collaboration
- ✅ Parallel Development: Work on different repositories
- ✅ Clear Ownership: One repository per domain
- ✅ Easier Code Review: Smaller, focused PRs

## Multi-Tenant Architecture

During the migration of person functions, we discovered that the `personen` table has a `gebruiker_id` column for multi-tenant support. This means:

- Each user's data is isolated by `gebruiker_id`
- All person operations must be scoped to a specific user
- The repository provides **both** global methods (for admin/system operations) and user-scoped methods (for normal operations)

### User-Scoped Methods Pattern

All user-scoped methods follow this naming convention:
```typescript
// Global method (admin/system use)
async findById(id: number): Promise<Persoon | null>

// User-scoped method (normal operations)
async findByIdForUser(id: number, userId: number): Promise<Persoon | null>
```

User-scoped methods automatically add `WHERE gebruiker_id = @userId` to their queries, ensuring:
1. ✅ Data isolation between users
2. ✅ Automatic access control
3. ✅ No accidental cross-user data access
4. ✅ Simplified business logic in functions

### Migrated Functions

All person functions now support both legacy service and new repository pattern via `USE_REPOSITORY_PATTERN` feature flag:

| Function | Route | Method | Status |
|----------|-------|--------|--------|
| createPersoon | POST /personen | Uses `createForUser()` | ✅ MIGRATED |
| getPersoonById | GET /personen/{id} | Uses `findByIdForUser()` | ✅ MIGRATED |
| updatePersoon | PUT /personen/{id} | Uses `updateForUser()` | ✅ MIGRATED |
| deletePersoon | DELETE /personen/{id} | Uses `deleteForUser()` | ✅ MIGRATED |

## Next Steps

1. ✅ **PersoonRepository** - COMPLETED (628 lines, 23 tests, all functions migrated)
2. **Implement PartijRepository** (dossier-person linking)
3. **Continue with KindRepository** (children + parent-child relations)
4. **Rinse and repeat** for remaining domains

## Questions?

- Check existing `DossierRepository` implementation as reference
- Review `BaseRepository` for available utilities
- Follow the migration pattern in `createDossier.ts`
- Test thoroughly with both feature flag values

## References

- [Strangler Fig Pattern - Martin Fowler](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Repository Pattern - Microsoft Docs](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)
