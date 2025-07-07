# Database Schema Documentation

## Overview

This document contains the complete database schema for our SQL Server database on Azure. The database contains both old tables (suffixed with `_oud`) and new tables with improved naming conventions.

## Table Structure

### Tables (Current Schema)

#### dbo.dossiers

- **id** (int, PK, Identity) - Primary key
- **dossier_nummer** (nvarchar(50), NOT NULL, UNIQUE)
- **aangemaakt_op** (datetime, NOT NULL, default: getdate())
- **gewijzigd_op** (datetime, NOT NULL, default: getdate())
- **status** (nvarchar(50), NOT NULL)
- **gebruiker_id** (int, NOT NULL, FK → dbo.gebruikers.id)

#### dbo.gebruikers

- **id** (int, PK, Identity) - Primary key
- Additional columns to be defined (currently only ID is shown)

#### dbo.personen

- **id** (int, PK, Identity) - Primary key
- **voorletters** (nvarchar(10), nullable)
- **voornamen** (nvarchar(100), nullable)
- **roepnaam** (nvarchar(50), nullable)
- **geslacht** (nvarchar(10), nullable)
- **tussenvoegsel** (nvarchar(20), nullable)
- **achternaam** (nvarchar(100), NOT NULL)
- **adres** (nvarchar(200), nullable)
- **postcode** (nvarchar(10), nullable)
- **plaats** (nvarchar(100), nullable)
- **geboorte_plaats** (nvarchar(100), nullable)
- **geboorte_datum** (date, nullable)
- **nationaliteit_1** (nvarchar(50), nullable)
- **nationaliteit_2** (nvarchar(50), nullable)
- **telefoon** (nvarchar(20), nullable)
- **email** (nvarchar(100), nullable)
- **beroep** (nvarchar(100), nullable)

#### dbo.kinderen_ouders

- **id** (int, PK, Identity) - Primary key
- **kind_id** (int, NOT NULL, FK → dbo.personen.id)
- **ouder_id** (int, NOT NULL, FK → dbo.personen.id)
- **relatie_type_id** (int, NOT NULL, FK → dbo.relatie_types.id, default: 1)

#### dbo.dossiers_kinderen

- **id** (int, PK, Identity) - Primary key
- **dossier_id** (int, NOT NULL, FK → dbo.dossiers.id)
- **kind_id** (int, NOT NULL, FK → dbo.personen.id)

#### dbo.dossiers_partijen

- **id** (int, PK, Identity) - Primary key
- **dossier_id** (int, NOT NULL, FK → dbo.dossiers.id)
- **rol_id** (int, NOT NULL, FK → dbo.rollen.id)
- **persoon_id** (int, NOT NULL, FK → dbo.personen.id)

#### dbo.relatie_types

- **id** (int, PK, Identity) - Primary key
- **naam** (nvarchar(50), nullable)

#### dbo.rollen

- **id** (int, PK, Identity) - Primary key
- **naam** (nvarchar(50), nullable)

1. **Naming Convention**:
   - New: snake_case (e.g., `dossier_id`)

2. **Table Structure**:
   - New: Junction tables (e.g., `dossiers_partijen` with roles)

3. **Children Handling**:
   - New: `personen` table for all people, with `kinderen_ouders` junction table

4. **Authentication**:
   - New: Prepared for Auth0 integration (no password field)

### Foreign Key Relationships

- `dossiers.gebruiker_id` → `gebruikers.id`
- `dossiers_kinderen.dossier_id` → `dossiers.id`
- `dossiers_kinderen.kind_id` → `personen.id`
- `dossiers_partijen.dossier_id` → `dossiers.id`
- `dossiers_partijen.rol_id` → `rollen.id`
- `dossiers_partijen.persoon_id` → `personen.id`
- `kinderen_ouders.kind_id` → `personen.id`
- `kinderen_ouders.ouder_id` → `personen.id`
- `kinderen_ouders.relatie_type_id` → `relatie_types.id`
