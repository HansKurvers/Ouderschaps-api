# Development Mode

This project supports a development mode that skips authentication for easier local development and testing.

## Environment Variables

Add these to your `.env` file for development:

```bash
# Skip authentication in development
SKIP_AUTH=true

# Default user ID to use when authentication is skipped (optional)
DEV_USER_ID=1

# Set environment to development
NODE_ENV=development
```

## How It Works

When `SKIP_AUTH=true` or `NODE_ENV=development`:
- All endpoints will work without requiring the `x-user-id` header
- A default user ID will be used (from `DEV_USER_ID` or defaults to `1`)
- Authentication errors (401) will not be thrown

## Production Mode

In production, set:

```bash
SKIP_AUTH=false
NODE_ENV=production
```

Or simply remove these environment variables entirely. The system will then require:
- Valid `x-user-id` header for all authenticated endpoints
- Proper Auth0 integration (when implemented)

## Testing

Tests run in production mode by default to ensure authentication is properly tested. Individual tests can override this by setting `process.env.SKIP_AUTH` as needed.

## API Endpoints

All endpoints work the same way, but in development mode you can call them without headers:

### Development Mode
```bash
# No headers required
curl -X GET http://localhost:7071/api/dossiers
curl -X POST http://localhost:7071/api/dossiers
```

### Production Mode
```bash
# x-user-id header required
curl -X GET http://localhost:7071/api/dossiers -H "x-user-id: 123"
curl -X POST http://localhost:7071/api/dossiers -H "x-user-id: 123"
```