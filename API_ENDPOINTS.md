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
- `POST /dossiers/{dossierId}/zorg` - Create care entry
- `PUT /zorg/{zorgId}` - Update care entry
- `DELETE /zorg/{zorgId}` - Delete care entry

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
All endpoints (except health checks) require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```