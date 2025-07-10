# Ouderschaps-Api

Dit is een api die data ophaalt.

## Azure Functions v4 Setup

This project is built with Azure Functions v4, Node.js, and TypeScript for managing dossiers.

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

Ensure `local.settings.json` has the correct MongoDB connection string:

```json
{
  "Values": {
    "MONGODB_URI": "mongodb://localhost:27017/ouderschaps-db"
  }
}
```

### Development

Build: `npm run build`
Watch: `npm run watch`
Start: `npm start`

## API Documentation

### Authentication
Most endpoints require authentication via the `x-user-id` header. Only health check and lookup endpoints are publicly accessible.

### Endpoints

#### Health Check
- **GET** `/api/health` - Health check
  - **Authentication**: None
  - **Response**: Health status with version, timestamp, and environment info

#### Dossier Management

- **GET** `/api/dossiers` - Get dossiers with optional filters
  - **Authentication**: Required (`x-user-id` header)
  - **Query Parameters**:
    - `status` (optional): Filter by dossier status
    - `limit` (optional): Number of results (1-100, default 10)
    - `offset` (optional): Pagination offset (default 0)
  - **Response**: Array of dossiers for authenticated user

- **POST** `/api/dossiers` - Create new dossier
  - **Authentication**: Required (`x-user-id` header)
  - **Request Body**: Dossier data
  - **Response**: Created dossier object

- **GET** `/api/dossiers/{dossierId}` - Get specific dossier
  - **Authentication**: Required (`x-user-id` header)
  - **Response**: Detailed dossier information (user access required)

- **PUT** `/api/dossiers/{dossierId}` - Update dossier status
  - **Authentication**: Required (`x-user-id` header)
  - **Request Body**: `{ "status": "string" }`
  - **Response**: Updated dossier object

- **DELETE** `/api/dossiers/{dossierId}` - Delete dossier
  - **Authentication**: Required (`x-user-id` header)
  - **Response**: Deletion confirmation

#### Dossier Parties Management

- **GET** `/api/dossiers/{dossierId}/partijen` - Get dossier parties
  - **Authentication**: Required (`x-user-id` header)
  - **Response**: Array of parties (persons with roles) for the dossier

- **POST** `/api/dossiers/{dossierId}/partijen` - Add party to dossier
  - **Authentication**: Required (`x-user-id` header)
  - **Request Body**: Either `{ "persoonId": "id", "rolId": "id" }` or `{ "persoonData": {...}, "rolId": "id" }`
  - **Response**: Created party association

- **DELETE** `/api/dossiers/{dossierId}/partijen/{partijId}` - Remove party from dossier
  - **Authentication**: Required (`x-user-id` header)
  - **Response**: Removal confirmation

#### Person Management

- **POST** `/api/personen` - Create new person
  - **Authentication**: Required (`x-user-id` header)
  - **Request Body**: Person data with email validation
  - **Response**: Created person object

- **GET** `/api/personen/{persoonId}` - Get specific person
  - **Authentication**: Required (`x-user-id` header)
  - **Response**: Detailed person information

- **PUT** `/api/personen/{persoonId}` - Update person
  - **Authentication**: Required (`x-user-id` header)
  - **Request Body**: Updated person data
  - **Response**: Updated person object

#### Lookup Data

- **GET** `/api/lookups/rollen` - Get available roles
  - **Authentication**: None
  - **Response**: Array of available roles for dossier parties
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
