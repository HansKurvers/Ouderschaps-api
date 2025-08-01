# Omgang Batch Operations

This document explains the new batch operations for managing omgang data more efficiently.

## Overview

Instead of making individual API calls for each omgang entry in a week, you can now use batch operations to handle multiple entries in a single request. This significantly reduces the number of HTTP requests and improves performance.

## API Endpoints

### 1. Batch Create Omgang Entries
Create multiple omgang entries in a single request.

**Endpoint:** `POST /api/dossiers/{dossierId}/omgang/batch`

**Request Body:**
```json
{
  "entries": [
    {
      "dagId": 1,
      "dagdeelId": 1,
      "verzorgerId": 123,
      "wisselTijd": "09:00",
      "weekRegelingId": 1,
      "weekRegelingAnders": ""
    },
    {
      "dagId": 1,
      "dagdeelId": 2,
      "verzorgerId": 124,
      "wisselTijd": "17:00",
      "weekRegelingId": 1,
      "weekRegelingAnders": ""
    }
    // ... more entries
  ]
}
```

**Response:** Array of created omgang objects

### 2. Upsert Week Data
Replace all omgang entries for a specific week. This deletes existing entries and creates new ones.

**Endpoint:** `POST /api/dossiers/{dossierId}/omgang/week`

**Request Body:**
```json
{
  "weekRegelingId": 1,
  "weekRegelingAnders": "",
  "days": [
    {
      "dagId": 1,
      "wisselTijd": "09:00",
      "dagdelen": [
        {
          "dagdeelId": 1,
          "verzorgerId": 123
        },
        {
          "dagdeelId": 2,
          "verzorgerId": 124
        }
      ]
    },
    {
      "dagId": 2,
      "wisselTijd": "09:00",
      "dagdelen": [
        {
          "dagdeelId": 1,
          "verzorgerId": 123
        },
        {
          "dagdeelId": 2,
          "verzorgerId": 124
        }
      ]
    }
    // ... more days
  ]
}
```

**Response:** Array of created omgang objects

### 3. Get Week Data
Retrieve all omgang entries for a specific week.

**Endpoint:** `GET /api/dossiers/{dossierId}/omgang/week/{weekRegelingId}`

**Response:** Array of omgang objects for the specified week

## Frontend Integration Example

```typescript
// Instead of this (old approach):
for (const entry of weekEntries) {
  await fetch(`/api/dossiers/${dossierId}/omgang`, {
    method: 'POST',
    body: JSON.stringify(entry)
  });
}

// Use this (new approach):
await fetch(`/api/dossiers/${dossierId}/omgang/week`, {
  method: 'POST',
  body: JSON.stringify({
    weekRegelingId: 1,
    weekRegelingAnders: "",
    days: [
      {
        dagId: 1,
        wisselTijd: "09:00",
        dagdelen: [
          { dagdeelId: 1, verzorgerId: 123 },
          { dagdeelId: 2, verzorgerId: 124 }
        ]
      },
      // ... more days
    ]
  })
});
```

## Benefits

1. **Performance**: Reduces API calls from ~20-30 per week to just 1
2. **Atomicity**: All operations are wrapped in database transactions
3. **Simplicity**: Easier to manage entire week data as a unit
4. **Consistency**: Ensures week data is always in a valid state

## Error Handling

- If any entry in a batch fails validation, the entire batch is rejected
- Database transactions ensure all-or-nothing behavior
- Detailed error messages indicate which entries failed validation

## Key Changes

### wisselTijd is Day-Level
- `wisselTijd` is now specified once per day, not for each dagdeel (part of day)
- This reflects the actual business logic where switching time is consistent for all parts of a given day
- All dagdelen within a day share the same wisselTijd

## Validation Rules

- Maximum 100 entries per batch request
- Maximum 7 days per week request
- All required fields must be present for each entry
- `dagId` must be between 1-7
- `dagdeelId`, `verzorgerId`, and `weekRegelingId` must be positive integers
- `wisselTijd` is optional but must match HH:MM format if provided
- Each day must have at least one dagdeel