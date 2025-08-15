# Auth0 Migration Guide

## Overview
This backend has been updated to support Auth0 authentication while maintaining backward compatibility with the existing `x-user-id` header system.

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

## Backward Compatibility

The system maintains THREE authentication modes:

1. **Auth0 JWT** (Production)
   - `Authorization: Bearer <token>`
   - Validates with Auth0
   - Auto-registers users

2. **Legacy Header** (Transition)
   - `x-user-id: <numeric_id>`
   - Logs warning to console
   - Will be deprecated

3. **Development Mode**
   - `SKIP_AUTH=true`
   - Uses `DEV_USER_ID`
   - No token validation

## Migration Steps

### Phase 1: Deploy Backend (Current)
✅ Backend accepts both Auth0 and legacy auth
✅ Auto-registration for new Auth0 users
✅ Existing users continue working

### Phase 2: Frontend Migration
- Update frontend to send Auth0 tokens
- Remove x-user-id header logic
- Test with real Auth0 tokens

### Phase 3: Cleanup (Future)
- Remove legacy x-user-id support
- Make auth0_id required in database
- Remove deprecated functions

## Testing

Run auth tests:
```bash
npm test -- src/services/auth
```

Test with curl:
```bash
# Auth0 token
curl -H "Authorization: Bearer ${TOKEN}" http://localhost:7071/api/dossiers

# Legacy (deprecated)
curl -H "x-user-id: 1" http://localhost:7071/api/dossiers

# Development mode
SKIP_AUTH=true npm start
```

## Security Considerations

1. **Token Validation**: All tokens validated against Auth0 public keys
2. **Auto-Registration**: Only creates user, no permissions granted
3. **Data Isolation**: Users only see their own data (via gebruiker_id)
4. **No Auth0 IDs Exposed**: Internal IDs used in URLs/logs

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