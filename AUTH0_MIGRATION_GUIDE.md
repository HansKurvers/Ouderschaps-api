# Auth0 Migration Guide

## Overview
This backend has been updated to use Auth0 authentication exclusively. The insecure `x-user-id` header has been removed for security reasons.

## Architecture

### Authentication Flow
```
1. Frontend sends: Authorization: Bearer <auth0_jwt_token>
2. Backend validates JWT with Auth0 public key
3. Extracts auth0_id from token's 'sub' claim
4. Looks up or creates user in gebruikers table
5. Uses internal numeric ID for all database operations
```

### Key Components (SOLID + DRY + KISS)
- **JwtValidator**: Handles JWT token validation (Single Responsibility)
- **UserService**: Manages user lookup and auto-registration
- **AuthService**: Orchestrates authentication flow (Interface Segregation)
- **auth-helper.ts**: Backward compatible wrapper

## Environment Configuration

Add these variables to your `.env` file:

```env
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.ouderschaps.com
AUTH0_ISSUER=https://your-tenant.auth0.com/

# Development Settings (optional)
SKIP_AUTH=true          # Skip auth in development
DEV_USER_ID=1          # Default dev user ID
```

## Database Changes

The `dbo.gebruikers` table now includes Auth0 fields:

```sql
ALTER TABLE dbo.gebruikers ADD 
    auth0_id nvarchar(255) NULL UNIQUE,
    email nvarchar(255) NULL,
    naam nvarchar(255) NULL,
    laatste_login datetime NULL,
    aangemaakt_op datetime NOT NULL DEFAULT GETDATE(),
    gewijzigd_op datetime NOT NULL DEFAULT GETDATE();

CREATE INDEX IX_gebruikers_auth0_id ON dbo.gebruikers(auth0_id);
```

## Auto-Registration

New users are automatically registered on first login:
- Extracts user info from JWT token
- Creates entry in gebruikers table
- Returns internal numeric ID for database operations

## API Usage

### Frontend Requirements

Send JWT token in Authorization header:
```javascript
fetch('/api/dossiers', {
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        // x-user-id header no longer needed
    }
})
```

### Backend Implementation

All endpoints now use async authentication:

```typescript
// Old way (deprecated but still works)
const userId = getUserId(request);

// New way (recommended)
const userId = await requireAuthentication(request);
```

## Authentication Modes

The system supports TWO authentication modes:

1. **Auth0 JWT** (Production)
   - `Authorization: Bearer <token>`
   - Validates with Auth0 public keys
   - Auto-registers users on first login

2. **Development Mode** (Local only)
   - `SKIP_AUTH=true` in `.env`
   - Uses `DEV_USER_ID` 
   - No token validation
   - ⚠️ NEVER enable in production

## Migration Steps

### Phase 1: Backend Update (Complete)
✅ Backend accepts only Auth0 tokens
✅ Auto-registration for new Auth0 users
✅ Removed insecure x-user-id header

### Phase 2: Frontend Migration (Required)
⚠️ **IMPORTANT**: Frontend MUST send Auth0 tokens
- Update all API calls to include `Authorization: Bearer <token>`
- Remove any x-user-id header logic
- Test with real Auth0 tokens

### Phase 3: Production Deployment
- Ensure SKIP_AUTH=false in production
- Verify Auth0 environment variables are set
- Monitor for authentication failures

## Testing

Run auth tests:
```bash
npm test -- src/services/auth
```

Test with curl:
```bash
# Auth0 token (REQUIRED in production)
curl -H "Authorization: Bearer ${TOKEN}" http://localhost:7071/api/dossiers

# Development mode (local only)
SKIP_AUTH=true npm start
curl http://localhost:7071/api/dossiers  # No auth needed in dev mode
```

## Security Improvements

1. **Removed Security Vulnerability**: x-user-id header could be spoofed by anyone
2. **Cryptographic Validation**: All tokens validated against Auth0 public keys
3. **Auto-Registration**: Secure user creation on first login
4. **Data Isolation**: Users only see their own data (via gebruiker_id)
5. **No Auth0 IDs Exposed**: Internal IDs used in URLs/logs
6. **Development Mode**: Clearly separated, never enabled in production

## Troubleshooting

### "User not found"
- User hasn't logged in yet (auto-registration on first login)
- Check auth0_id format in database

### "Token expired"
- Frontend should refresh token before expiry
- Check token exp claim

### "Invalid audience"
- Verify AUTH0_AUDIENCE matches frontend config
- Check Auth0 API settings

## Next Steps

1. Configure Auth0 tenant with correct audience
2. Update frontend to send JWT tokens
3. Monitor logs for legacy auth usage
4. Plan deprecation timeline