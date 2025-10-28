# Ouderschaps API Endpoints

Base URL: `/api`

## Health Check
- `GET /health` - Basic health check
- `GET /health/auth-check` - Check authentication
- `GET /health/auth-debug` - Debug authentication
- `GET /health/env-check` - Check environment variables

## Dossiers
- `GET /dossiers` - Get all dossiers for authenticated user
- `GET /dossiers/{dossierId}` - Get specific dossier
- `POST /dossiers` - Create new dossier
- `PUT /dossiers/{dossierId}` - Update dossier
- `DELETE /dossiers/{dossierId}` - Delete dossier
- `PATCH /dossiers/{dossierId}/anonymity` - Update dossier anonymity flag

### Dossier Partijen (Parties)
- `GET /dossiers/{dossierId}/partijen` - Get parties in dossier
- `POST /dossiers/{dossierId}/partijen` - Add party to dossier
- `DELETE /dossiers/{dossierId}/partijen/{partijId}` - Remove party from dossier

### Dossier Kinderen (Children)
- `GET /dossiers/{dossierId}/kinderen` - Get children in dossier
- `POST /dossiers/{dossierId}/kinderen` - Add child to dossier
- `DELETE /dossiers/{dossierId}/kinderen/{kindId}` - Remove child from dossier

### Dossier Omgang (Contact/Visitation)
- `GET /dossiers/{dossierId}/omgang` - Get visitation schedule
- `POST /dossiers/{dossierId}/omgang` - Create visitation entry
- `POST /dossiers/{dossierId}/omgang/batch` - Create multiple visitation entries
- `PUT /omgang/{omgangId}` - Update visitation entry
- `DELETE /omgang/{omgangId}` - Delete visitation entry
- `GET /dossiers/{dossierId}/omgang/week` - Get weekly visitation
- `PUT /dossiers/{dossierId}/omgang/week` - Upsert weekly visitation

### Dossier Zorg (Care)
- `GET /dossiers/{dossierId}/zorg` - Get care arrangements
- `GET /dossiers/{dossierId}/zorg?categorieId={categoryId}` - Get care arrangements filtered by category
- `POST /dossiers/{dossierId}/zorg` - Create care entry
- `POST /dossiers/{dossierId}/zorg/upsert` - Upsert care entry
- `PUT /zorg/{zorgId}` - Update care entry
- `DELETE /zorg/{zorgId}` - Delete single care entry
- `DELETE /dossiers/{dossierId}/zorg/category/{categoryId}` - Bulk delete all care entries for a category

## Personen (Persons)
- `GET /personen` - Get all persons for authenticated user
- `GET /personen/{persoonId}` - Get specific person
- `POST /personen` - Create new person
- `PUT /personen/{persoonId}` - Update person
- `DELETE /personen/{persoonId}` - Delete person

## Kinderen (Children)
- `GET /kinderen/{kindId}/ouders` - Get parents of child
- `POST /kinderen/{kindId}/ouders` - Add parent to child
- `PUT /kinderen/{kindId}/ouders/{ouderId}` - Update parent-child relationship
- `DELETE /kinderen/{kindId}/ouders/{ouderId}` - Remove parent from child

## Alimentatie (Alimony)
- `GET /dossiers/{dossierId}/alimentatie` - Get alimony for dossier
- `POST /dossiers/{dossierId}/alimentatie` - Create alimony
- `PUT /dossiers/{dossierId}/alimentatie` - Update alimony
- `PUT /dossiers/{dossierId}/alimentatie/upsert` - Upsert alimony
- `GET /alimentatie/templates` - Get alimony templates

### Bijdrage Kosten (Contribution Costs)
- `GET /dossiers/{dossierId}/bijdrage-kosten` - Get contribution costs
- `POST /dossiers/{dossierId}/bijdrage-kosten` - Create contribution cost
- `PUT /dossiers/{dossierId}/bijdrage-kosten` - Replace all contribution costs
- `PUT /dossiers/{dossierId}/bijdrage-kosten/upsert` - Upsert contribution costs

### Financiele Afspraken (Financial Agreements)
- `GET /dossiers/{dossierId}/financiele-afspraken` - Get financial agreements
- `POST /dossiers/{dossierId}/financiele-afspraken` - Create financial agreement
- `PUT /dossiers/{dossierId}/financiele-afspraken` - Replace all financial agreements

## Ouderschapsplan Info (Parenting Plan Info)
- `GET /ouderschapsplan` - Get all parenting plan info (paginated)
- `GET /ouderschapsplan/{infoId}` - Get specific parenting plan info
- `GET /personen/{persoonId}/ouderschapsplan` - Get parenting plan info for person
- `GET /dossiers/{dossierId}/ouderschapsplan` - Get parenting plan info for dossier
- `POST /ouderschapsplan` - Create parenting plan info (requires dossierId in body)
- `PUT /ouderschapsplan/{infoId}` - Update parenting plan info
- `PUT /dossiers/{dossierId}/ouderschapsplan` - Upsert parenting plan info for dossier
- `DELETE /ouderschapsplan/{infoId}` - Delete parenting plan info

## Lookups
- `GET /dagen` - Get days
- `GET /dagdelen` - Get day parts
- `GET /relatie-types` - Get relationship types
- `GET /rollen` - Get roles
- `GET /schoolvakanties` - Get school holidays
- `GET /week-regelingen` - Get week arrangements
- `GET /zorg-categorieen` - Get care categories
- `GET /zorg-situaties` - Get care situations
- `GET /regelingen-templates` - Get arrangement templates

## Authentication
All endpoints (except health checks and lookups) require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Detailed Endpoint Documentation

### Bulk Delete Zorg by Category

**Endpoint:** `DELETE /dossiers/{dossierId}/zorg/category/{categoryId}`

**Description:** Efficiently delete all zorg (care arrangement) records for a specific category within a dossier. Useful for "reset" functionality when users want to clear all arrangements of a specific type (e.g., all vacation arrangements).

**Authentication:** Required (JWT)

**Authorization:** User must own the dossier (checked via `gebruiker_id`)

**Path Parameters:**
- `dossierId` (number, required) - The dossier ID
- `categoryId` (number, required) - The zorg category ID to delete
  - Example: `6` = Vakanties (Vacations)
  - Example: `9` = Feestdagen (Holidays)
  - Example: `10` = Bijzondere dagen (Special days)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deleted": 5,
    "message": "Successfully deleted 5 zorg records",
    "categoryId": 6,
    "dossierId": 123
  }
}
```

**Response (200 OK - No records found):**
```json
{
  "success": true,
  "data": {
    "deleted": 0,
    "message": "No zorg records found for this category",
    "categoryId": 6,
    "dossierId": 123
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid dossierId or categoryId
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User does not own this dossier
- `500 Internal Server Error` - Database or server error

**Use Cases:**
1. **Manual Reset Button:** User clicks "Alles wissen" in frontend to clear all arrangements of a specific type
2. **Automatic Reset:** System clears all arrangements when user modifies parties or children in dossier
3. **Bulk Operations:** More efficient than deleting records individually (80% performance improvement)

**Example Request:**
```bash
curl -X DELETE \
  https://api.example.com/api/dossiers/123/zorg/category/6 \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Implementation Details:**
- Performs atomic database operation (no partial failures)
- Uses parameterized queries to prevent SQL injection
- Logs deleted count for audit trail
- Returns zero if no records found (not an error)