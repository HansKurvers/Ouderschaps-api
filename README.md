# Ouderschapsplan API

API voor het Ouderschapsplan platform - beheer van dossiers, partijen, kinderen en ouderschapsplannen.

## Azure Functions v4 Setup

This project is built with Azure Functions v4, Node.js, and TypeScript for the Ouderschapsplan platform.

### Prerequisites

- Node.js 18+
- Azure Functions Core Tools v4
- MongoDB instance (local or cloud)
- Azure Storage Emulator or Azurite (for local development)

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file with the following variables:

```env
# Database Configuration
DB_SERVER=your-server.database.windows.net
DB_DATABASE=your-database
DB_USER=your-user
DB_PASSWORD=your-password

# Auth0 Configuration (Production)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.ouderschaps.com
AUTH0_ISSUER=https://your-tenant.auth0.com/

# Development Mode (Local only - NEVER in production!)
SKIP_AUTH=true          # Skip authentication in development
DEV_USER_ID=1          # Default user ID for development
NODE_ENV=development   # Set to 'production' in production
```

### Development

Build: `npm run build`
Watch: `npm run watch`
Start: `npm start`

## Authentication Flow

### Overview
This API uses **Auth0 JWT tokens** for authentication. The insecure `x-user-id` header has been removed for security reasons.

### How It Works

```
1. Frontend authenticates user with Auth0
2. Frontend receives JWT access token
3. Frontend sends token in Authorization header: Bearer <token>
4. Backend validates token with Auth0's public keys (RS256)
5. Backend extracts user's Auth0 ID from token's 'sub' claim
6. Backend looks up or creates user in local database
7. Backend uses internal numeric ID for all operations
```

### Implementation Details

#### Why Not Auth0 SDK?
We use `jsonwebtoken` + `jwks-rsa` instead of the full Auth0 SDK because:
- **Lighter weight**: Just JWT validation, no unnecessary features
- **Azure Functions optimized**: Fits serverless model better than Express middleware
- **More control**: Direct handling of Azure Functions' HttpRequest objects
- **Better testability**: Easier to mock individual operations
- **These ARE Auth0 libraries**: Just the low-level ones recommended for serverless

#### Security Features
- **Cryptographic validation**: All tokens validated against Auth0 public keys
- **Auto-registration**: New users automatically created on first login
- **Data isolation**: Users only see their own data via internal IDs
- **No Auth0 IDs exposed**: Internal numeric IDs used in URLs/logs

#### Authentication Modes

**Production Mode** (Default)
```javascript
// Frontend must send Auth0 JWT token
fetch('/api/dossiers', {
    headers: {
        'Authorization': `Bearer ${accessToken}`
    }
})
```

**Development Mode** (Local only)
```env
# In .env file - NEVER enable in production!
SKIP_AUTH=true
DEV_USER_ID=1
```

### User Registration Flow

1. User logs in via Auth0 in frontend
2. First API request with new Auth0 token
3. Backend auto-creates user in `dbo.gebruikers` table:
   - `auth0_id`: From token's 'sub' claim (e.g., "auth0|123456")
   - `email`: From token's email claim
   - `naam`: From token's name claim
   - `laatste_login`: Current timestamp
4. Returns internal numeric `id` for database operations
5. All subsequent requests use this internal ID

### Database Schema

```sql
-- Users table with Auth0 integration
CREATE TABLE dbo.gebruikers (
    id int IDENTITY(1,1) PRIMARY KEY,      -- Internal ID
    auth0_id nvarchar(255) UNIQUE,         -- Auth0 user ID
    email nvarchar(255),                   -- User email
    naam nvarchar(255),                    -- User name
    laatste_login datetime,                -- Last login time
    aangemaakt_op datetime DEFAULT GETDATE(),
    gewijzigd_op datetime DEFAULT GETDATE()
);
```

## API Documentation

### Authentication
All endpoints require Auth0 JWT authentication except health check and lookup endpoints.

### Endpoints

#### Health Check
- **GET** `/api/health` - Health check
  - **Authentication**: None
  - **Response**: Health status with version, timestamp, and environment info

#### Dossier Management

- **GET** `/api/dossiers` - Get dossiers with optional filters
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Query Parameters**:
    - `includeInactive` (optional): Include both active and inactive dossiers - boolean (default: false)
    - `onlyInactive` (optional): Show only inactive/completed dossiers - boolean (default: false)
    - `limit` (optional): Number of results (1-100, default 10)
    - `offset` (optional): Pagination offset (default 0)
  - **Response**: Array of dossiers for authenticated user
  - **Default behavior**: Returns only active dossiers (status = false)

- **POST** `/api/dossiers` - Create new dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: Dossier data
  - **Response**: Created dossier object

- **GET** `/api/dossiers/{dossierId}` - Get specific dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Detailed dossier information (user access required)

- **PUT** `/api/dossiers/{dossierId}` - Update dossier status
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: `{ "status": boolean }` (false = active/in progress, true = completed)
  - **Response**: Updated dossier object

- **DELETE** `/api/dossiers/{dossierId}` - Delete dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Deletion confirmation

#### Dossier Parties Management

- **GET** `/api/dossiers/{dossierId}/partijen` - Get dossier parties
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Array of parties (persons with roles) for the dossier

- **POST** `/api/dossiers/{dossierId}/partijen` - Add party to dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: Either `{ "persoonId": "id", "rolId": "id" }` or `{ "persoonData": {...}, "rolId": "id" }`
  - **Response**: Created party association

- **DELETE** `/api/dossiers/{dossierId}/partijen/{partijId}` - Remove party from dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Removal confirmation

#### Person Management

- **GET** `/api/personen` - Get all personen with pagination
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Query Parameters**:
    - `limit` (optional): Number of results (1-100, default 50)
    - `offset` (optional): Pagination offset (default 0)
  - **Response**: Array of personen with pagination metadata

- **POST** `/api/personen` - Create new person
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: Person data with email validation
  - **Response**: Created person object

- **GET** `/api/personen/{persoonId}` - Get specific person
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Detailed person information

- **PUT** `/api/personen/{persoonId}` - Update person
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: Updated person data
  - **Response**: Updated person object

- **DELETE** `/api/personen/{persoonId}` - Delete person
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Deletion confirmation

#### FASE 3: Children & Parent-Child Relationships

- **GET** `/api/dossiers/{dossierId}/kinderen` - Get children in dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Array of children with their parent relationships

- **POST** `/api/dossiers/{dossierId}/kinderen` - Add child to dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: Either `{ "kindId": "id", "ouderRelaties": [...] }` or `{ "kindData": {...}, "ouderRelaties": [...] }`
  - **Response**: Created child association with parent relationships

- **DELETE** `/api/dossiers/{dossierId}/kinderen/{dossierKindId}` - Remove child from dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Removal confirmation

- **GET** `/api/kinderen/{kindId}/ouders` - Get parents of a child
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Array of parent relationships for the child

- **POST** `/api/kinderen/{kindId}/ouders` - Add parent to child
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: `{ "ouderId": "id", "relatieTypeId": "id" }`
  - **Response**: Created parent-child relationship

- **PUT** `/api/kinderen/{kindId}/ouders/{ouderId}` - Update parent-child relationship
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: `{ "relatieTypeId": "id" }`
  - **Response**: Updated relationship

- **DELETE** `/api/kinderen/{kindId}/ouders/{ouderId}` - Remove parent from child
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Removal confirmation

#### FASE 4: Visitation & Care (Omgang & Zorg)

##### Visitation Schedules (Omgang)

- **GET** `/api/dossiers/{dossierId}/omgang` - Get visitation schedules for dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Array of visitation schedules with details

- **POST** `/api/dossiers/{dossierId}/omgang` - Create visitation schedule
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: `{ "dagId": 1-7, "dagdeelId": "id", "verzorgerId": "id", "wisselTijd": "HH:MM", "weekRegelingId": "id", "weekRegelingAnders": "string" }`
  - **Response**: Created visitation schedule

- **PUT** `/api/dossiers/{dossierId}/omgang/{omgangId}` - Update visitation schedule
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: Partial visitation schedule data
  - **Response**: Updated visitation schedule

- **DELETE** `/api/dossiers/{dossierId}/omgang/{omgangId}` - Delete visitation schedule
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Deletion confirmation

##### Care Arrangements (Zorg)

- **GET** `/api/dossiers/{dossierId}/zorg` - Get care arrangements for dossier
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Array of care arrangements with details

- **POST** `/api/dossiers/{dossierId}/zorg` - Create care arrangement
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: `{ "zorgCategorieId": "id", "zorgSituatieId": "id", "situatieAnders": "string", "overeenkomst": "string" }`
  - **Response**: Created care arrangement

- **PUT** `/api/dossiers/{dossierId}/zorg/{zorgId}` - Update care arrangement
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Request Body**: Partial care arrangement data
  - **Response**: Updated care arrangement

- **DELETE** `/api/dossiers/{dossierId}/zorg/{zorgId}` - Delete care arrangement
  - **Authentication**: Required (`Authorization: Bearer <token>`)
  - **Response**: Deletion confirmation

#### Lookup Data

- **GET** `/api/rollen` - Get available roles
  - **Authentication**: None
  - **Response**: Array of available roles for dossier parties
  - **Note**: Response is cached for 5 minutes for performance

- **GET** `/api/relatie-types` - Get relationship types
  - **Authentication**: None
  - **Response**: Array of parent-child relationship types
  - **Note**: Response is cached for 5 minutes for performance

- **GET** `/api/dagen` - Get days of the week
  - **Authentication**: None
  - **Response**: Array of days (1-7 for Monday-Sunday)
  - **Note**: Response is cached for 5 minutes for performance

- **GET** `/api/dagdelen` - Get parts of day
  - **Authentication**: None
  - **Response**: Array of day parts (morning, afternoon, evening, etc.)
  - **Note**: Response is cached for 5 minutes for performance

- **GET** `/api/week-regelingen` - Get week arrangements
  - **Authentication**: None
  - **Response**: Array of weekly visitation arrangements
  - **Note**: Response is cached for 5 minutes for performance

- **GET** `/api/zorg-categorieen` - Get care categories
  - **Authentication**: None
  - **Response**: Array of care categories
  - **Note**: Response is cached for 5 minutes for performance

- **GET** `/api/zorg-situaties` - Get care situations
  - **Authentication**: None
  - **Query Parameters**: `categorieId` (optional) - Filter by care category
  - **Response**: Array of care situations
  - **Note**: Response is cached for 5 minutes for performance

### Error Handling

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (access denied)
- `404` - Not Found
- `500` - Internal Server Error

### Request Validation

All endpoints use Joi validation for request data. Invalid requests return detailed error messages with status code 400.

<!-- Test deployment after fixing Azure Federated Credential case-sensitivity issue - 2025-10-20 -->
