# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Azure Functions v4 API built with TypeScript and Node.js 18+ for managing family mediation dossiers (Ouderschaps-api). The API handles dossiers, persons, children, visitation schedules (omgang), care arrangements (zorg), child support (alimentatie), and parenting plans (ouderschapsplan).

## Common Development Commands

### Build & Development
```bash
npm run build           # Build TypeScript to dist/ and add package.json for CommonJS
npm run watch           # Watch mode for continuous compilation
npm start               # Start Azure Functions locally (requires build first)
```

### Testing
```bash
npm test                # Run all Jest tests
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Format code with Prettier
npm run format:check    # Check formatting without changes
npm run typecheck       # Run TypeScript type checking
npm run check-all       # Run typecheck, lint, and format:check together
```

## Architecture

### Authentication Flow

The API uses **Auth0 JWT tokens** for authentication with an auto-registration system:

1. Frontend sends JWT token in `Authorization: Bearer <token>` header
2. Backend validates token using `jsonwebtoken` + `jwks-rsa` (lightweight Auth0 libraries)
3. Backend extracts Auth0 user ID from token's `sub` claim
4. Backend auto-creates user in `dbo.gebruikers` table on first login
5. Backend uses internal numeric user ID for all database operations

**Development Mode**: Set `SKIP_AUTH=true` and `DEV_USER_ID=1` in `.env` to bypass auth locally.

**Key Files**:
- `src/services/auth/auth.service.ts` - Main auth orchestration
- `src/services/auth/jwt-validator.ts` - JWT token validation with Auth0
- `src/services/auth/user.service.ts` - User lookup and auto-registration
- `src/utils/auth-helper.ts` - Convenience functions for endpoints

### Request/Response Pattern

All Azure Functions follow this pattern:

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

export async function myFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // 1. Authenticate (throws on failure)
        const userId = await requireAuthentication(request);

        // 2. Parse/validate request (use Joi schemas from validators/)
        const body = await request.json();
        const { error, value } = mySchema.validate(body);
        if (error) {
            return createErrorResponse('Validation error: ' + error.details.map(d => d.message).join(', '), 400);
        }

        // 3. Execute business logic (use DatabaseService)
        const service = new MyDatabaseService();
        await service.initialize();
        const result = await service.doSomething(userId, value);

        // 4. Return standardized response
        return createSuccessResponse(result, 200);
    } catch (error) {
        context.error('Error in myFunction:', error);
        return createErrorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
    }
}

// Register route
app.http('myFunction', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'my-route',
    handler: myFunction,
});
```

**Response Helpers** (`src/utils/response-helper.ts`):
- `createSuccessResponse(data, statusCode?)` - Wraps data in `{ success: true, data: ... }`
- `createErrorResponse(error, statusCode?)` - Returns `{ success: false, error: "..." }`
- `createUnauthorizedResponse()` - Returns 401
- `createNotFoundResponse(resource)` - Returns 404
- `createForbiddenResponse()` - Returns 403

### Database Layer

**⚠️ MIGRATION IN PROGRESS: Repository Pattern**

The project is migrating from monolithic `DossierDatabaseService` to Repository Pattern using the **Strangler Fig Pattern**. Both approaches coexist during migration.

#### New Approach: Repository Pattern (RECOMMENDED) ✅

All new code should use domain-specific repositories:

```typescript
import { DossierRepository } from '../../repositories/DossierRepository';

const repository = new DossierRepository();
const dossier = await repository.findById(dossierId);
const newDossier = await repository.create(userId);
```

**Available Repositories**:
- ✅ `DossierRepository` - Dossier CRUD, status updates, cascade deletion (14 tests)
- ✅ `PersoonRepository` - Person CRUD with user-scoped methods (23 tests, 4 functions migrated)
- 🔄 `PartijRepository` - TODO
- 🔄 `KindRepository` - TODO
- 🔄 Other repositories - See `REPOSITORY_MIGRATION_GUIDE.md`

**BaseRepository**: All repositories extend `BaseRepository` which provides:
- `executeQuery<T>()` - Parameterized query execution
- `querySingle<T>()` - Get first record or null
- `queryMany<T>()` - Get all records
- `exists()` - Check if record exists
- `beginTransaction()` - Start transaction
- `executeInTransaction()` - Execute within transaction

**Multi-Tenant Architecture**: Repositories support user-scoped methods:
```typescript
// Global method (admin/system use)
await repository.findById(id);

// User-scoped method (normal operations - PREFERRED)
await repository.findByIdForUser(id, userId);
```
User-scoped methods automatically add `WHERE gebruiker_id = @userId` for data isolation and access control.

#### Legacy Approach: DossierDatabaseService (DEPRECATED) ⚠️

Existing code still uses monolithic service (2981 lines):

```typescript
import { DossierDatabaseService } from '../../services/database-service';

const service = new DossierDatabaseService();
await service.initialize();
try {
    const dossier = await service.getDossierById(dossierId);
} finally {
    await service.close();
}
```

**Migration Status**:
- Feature flag: `USE_REPOSITORY_PATTERN=true` in `.env`
- Migrated functions: `createDossier`, `createPersoon`, `getPersoonById`, `updatePersoon`, `deletePersoon`
- All migrated functions support both legacy and new approaches via feature flag
- Goal: Migrate all functions, then remove legacy service

**See**: `REPOSITORY_MIGRATION_GUIDE.md` for complete migration strategy

#### Common Database Patterns

**Key Points** (apply to both approaches):
- Uses shared connection pool via `getPool()` (don't close in Azure Functions)
- Always use parameterized queries with `@parameter` syntax to prevent SQL injection
- Table names use `snake_case` convention (e.g., `dbo.dossiers_partijen`)
- Use `DbMappers` utility to convert database records to domain models

**Database Connection**:
- Config in `src/config/database.ts`
- Connection pool initialized once and reused across function invocations
- Uses environment variables: `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`

### Validation Pattern

All request validation uses **Joi** schemas in `src/validators/` directory:

```typescript
import Joi from 'joi';

export const mySchema = Joi.object({
    name: Joi.string().max(100).required(),
    email: Joi.string().email().optional(),
    age: Joi.number().integer().min(0).max(120).optional()
});

export const validateMyData = (data: any) => {
    return mySchema.validate(data, { abortEarly: false });
};
```

Existing validators:
- `persoon-validator.ts` - Person validation with address, email, postal code patterns
- `kind-validator.ts` - Child and parent-child relationship validation
- `omgang-validator.ts` - Visitation schedule validation
- `zorg-validator.ts` - Care arrangement validation
- `alimentatie-validator.ts` - Child support validation

### Folder Structure

```
src/
├── config/               # Configuration files (database, auth0)
├── functions/            # Azure Functions handlers (one per endpoint)
│   ├── dossiers/        # Dossier CRUD and related operations
│   ├── personen/        # Person CRUD
│   ├── kinderen/        # Child-parent relationships
│   ├── alimentatie/     # Child support
│   ├── ouderschapsplan/ # Parenting plans
│   ├── lookups/         # Lookup tables (rollen, dagen, etc.)
│   ├── health/          # Health check and debug endpoints
│   └── debug/           # Development debug endpoints
├── services/             # Business logic and database services
│   ├── auth/            # Auth0 integration (jwt-validator, user.service, auth.service)
│   ├── database.service.ts      # Base database service class
│   └── database-service.ts      # Specific database services
├── validators/           # Joi validation schemas
├── utils/               # Helper utilities (auth-helper, response-helper, db-mappers)
├── models/              # TypeScript interfaces/types
├── tests/               # Jest test files (mirror src/ structure)
└── index.ts             # Entry point - imports all functions to register routes
```

**Important**: All function files must be imported in `src/index.ts` to register their routes.

### Database Schema Key Points

See `database-schema.md` for full schema documentation. Key tables:

- **dbo.gebruikers** - Users (mediators) with Auth0 integration
- **dbo.personen** - Unified table for all persons (parents, children, parties)
- **dbo.dossiers** - Main dossier/case files
- **dbo.dossiers_partijen** - Links persons to dossiers with roles (junction table)
- **dbo.dossiers_kinderen** - Links children to dossiers (junction table)
- **dbo.kinderen_ouders** - Parent-child relationships with relationship types
- **dbo.omgang** - Visitation schedules (day, time, caregiver, week arrangement)
- **dbo.zorg** - Care arrangements by category and situation
- **dbo.rollen** - Lookup: roles for dossier parties
- **dbo.relatie_types** - Lookup: parent-child relationship types

**Important Patterns**:
- Use `snake_case` for all database identifiers
- Foreign keys follow pattern: `table_id` references `table.id`
- Junction tables for many-to-many relationships
- Override fields for "Anders" (other) selections: `week_regeling_anders`, `situatie_anders`
- Audit fields: `aangemaakt_op`, `gewijzigd_op`, `aangemaakt_door`, `gewijzigd_door`

### User Data Isolation

All user data must be isolated by `gebruiker_id`:

1. **Dossiers**: Each dossier has a `gebruiker_id` (the mediator)
2. **Access Control**: Functions must verify user owns the dossier before operations
3. **Helper Pattern**: Many database services include ownership checks

Example:
```typescript
const dossier = await service.getDossierById(dossierId, userId);
if (!dossier) {
    return createNotFoundResponse('Dossier');
}
```

### Lookup Tables & Caching

Lookup endpoints (roles, days, care categories, etc.) are in `src/functions/lookups/`:
- No authentication required
- Responses cached for 5 minutes (Azure Functions level)
- Read-only data that rarely changes

### TypeScript Configuration

- **Target**: ES2022 modules
- **Output**: dist/ directory with CommonJS package.json for Azure Functions
- **Module Resolution**: Node
- **Strict Mode**: Enabled

## Core Development Principles

### DRY (Don't Repeat Yourself)

From existing `claude.md`:
- Extract common logic into reusable functions/modules
- Create shared utilities for repeated patterns
- Use configuration objects instead of hardcoded values
- Centralize database queries in service layers

**Red flags to watch for**:
- Copy-pasted code blocks
- Similar functions with slight variations
- Hardcoded values appearing multiple times
- Duplicate validation logic

### Test-Driven Development (TDD)

From existing `claude.md`:

**TDD Cycle**:
1. **Red** - Write a failing test
2. **Green** - Write minimal code to pass
3. **Refactor** - Improve code while keeping tests green

**Test guidelines**:
- Test behavior, not implementation
- One assertion per test when possible
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies
- Keep tests fast and isolated

Tests are located in `src/tests/` mirroring the function structure.

## Common Gotchas

1. **Authentication in Dev vs Prod**: Always test with auth enabled before deploying
2. **SQL Injection**: Always use parameterized queries with `@parameter` syntax
3. **User Isolation**: Always verify `gebruiker_id` matches authenticated user for dossier operations
4. **Connection Pool**: Don't close database connections in Azure Functions (reused across invocations)
5. **Route Registration**: New functions must be imported in `src/index.ts`
6. **Build Step**: Azure Functions requires `npm run build` before `npm start`
7. **Case Sensitivity**: Database uses `snake_case`, TypeScript often uses `camelCase` - use mappers when needed
8. **Override Fields**: When user selects "Anders", store custom text in `_anders` fields (e.g., `week_regeling_anders`)

## API Documentation

See `README.md` and `API_ENDPOINTS.md` for comprehensive endpoint documentation including:
- Authentication requirements
- Query parameters and request bodies
- Response formats
- Error codes and meanings

## Additional Documentation

- `AUTH0_MIGRATION_GUIDE.md` - Auth0 integration details and migration notes
- `DEVELOPMENT.md` - Development mode configuration for local testing
- `TODO.md` - Project roadmap and pending tasks
- `database-schema.md` - Complete database schema with relationships and common queries
