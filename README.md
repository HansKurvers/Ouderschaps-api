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

### Endpoints

- **GET** `/api/health` - Health check
- **GET** `/api/dossiers` - Get dossiers with optional filters (status, priority, limit, offset)
