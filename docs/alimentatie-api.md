# Alimentatie API Documentation

## Overview
The Alimentatie API provides endpoints for managing child support (alimentatie) calculations, financial agreements, and cost distributions for divorce mediation cases.

## Database Structure
- `alimentaties` - Main table for alimentatie records
- `bijdrage_templates` - Templates for contribution calculations
- `bijdragen_kosten_kinderen` - Cost contributions per child
- `financiele_afspraken_kinderen` - Financial agreements per child

## Endpoints

### 1. GET /api/dossiers/{dossierId}/alimentatie
Retrieve alimentatie data for a specific dossier.

**Response:**
```json
{
  "alimentatie": {
    "id": 1,
    "dossierId": 123,
    "nettoBesteedbaarGezinsinkomen": 5000.00,
    "kostenKinderen": 1500.00,
    "bijdrageKostenKinderenId": 1,
    "bijdrageTemplateId": 2
  },
  "bijdrageTemplate": {
    "id": 2,
    "omschrijving": "Co-ouderschap 50/50 verdeling"
  },
  "bijdragenKostenKinderen": [
    {
      "id": 1,
      "alimentatieId": 1,
      "personenId": 456
    }
  ],
  "financieleAfsprakenKinderen": [
    {
      "id": 1,
      "alimentatieId": 1,
      "kindId": 789
    }
  ]
}
```

### 2. POST /api/dossiers/{dossierId}/alimentatie
Create new alimentatie for a dossier.

**Request Body:**
```json
{
  "nettoBesteedbaarGezinsinkomen": 5000.00,
  "kostenKinderen": 1500.00,
  "bijdrageTemplateId": 2
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "dossierId": 123,
  "nettoBesteedbaarGezinsinkomen": 5000.00,
  "kostenKinderen": 1500.00,
  "bijdrageKostenKinderenId": null,
  "bijdrageTemplateId": 2
}
```

### 3. PUT /api/alimentatie/{id}
Update existing alimentatie.

**Request Body:**
```json
{
  "nettoBesteedbaarGezinsinkomen": 5500.00,
  "kostenKinderen": 1600.00,
  "bijdrageTemplateId": 3
}
```

**Response:** 200 OK

### 4. GET /api/alimentatie/templates
Get all available alimentatie templates.

**Response:**
```json
[
  {
    "id": 1,
    "omschrijving": "Standaard kinderalimentatie berekening volgens Trema-normen"
  },
  {
    "id": 2,
    "omschrijving": "Co-ouderschap 50/50 verdeling"
  },
  {
    "id": 3,
    "omschrijving": "Weekendregeling met hoofdverblijf"
  },
  {
    "id": 4,
    "omschrijving": "Aangepaste regeling"
  }
]
```

### 5. POST /api/alimentatie/{id}/bijdragen-kosten
Add contribution costs for children (links a person to cost contributions).

**Request Body (single):**
```json
{
  "personenId": 456
}
```

**Request Body (multiple):**
```json
[
  {
    "personenId": 456
  },
  {
    "personenId": 789
  }
]
```

**Response:** 201 Created

### 6. POST /api/alimentatie/{id}/financiele-afspraken
Add financial agreements for children.

**Request Body (single):**
```json
{
  "kindId": 789
}
```

**Request Body (multiple):**
```json
[
  {
    "kindId": 789
  },
  {
    "kindId": 790
  }
]
```

**Response:** 201 Created


## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation errors: personenId is required and must be a number"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Alimentatie not found"
}
```

### 409 Conflict
```json
{
  "error": "Alimentatie already exists for this dossier"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create alimentatie"
}
```

## Authentication
All endpoints require authentication using Auth0 JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Data Validation

### Alimentatie
- `nettoBesteedbaarGezinsinkomen` must be a positive number if provided
- `kostenKinderen` must be a positive number if provided
- `bijdrageTemplateId` must be a valid template ID if provided

### Bijdragen Kosten Kinderen
- `personenId` is required and must exist in the personen table

### Financiele Afspraken Kinderen
- `kindId` is required and must exist in the personen table

## Database Migration
Run the migration script `003_create_alimentatie_tables.sql` to create the required database tables:
- `dbo.alimentaties`
- `dbo.bijdrage_templates`
- `dbo.bijdragen_kosten_kinderen`
- `dbo.financiele_afspraken_kinderen`