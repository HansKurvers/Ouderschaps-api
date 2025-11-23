# Database Schema Documentation

**Last Updated:** 2025-10-30 (Verified against live Azure SQL Database - Added gezag_termijn_weken and woonplaats fields)

## Overview
This document contains the **complete and verified** database schema for the SQL Server database on Azure. All tables use snake_case naming convention and are properly normalized with foreign key relationships.

**Database:** `db-ouderschapsplan` on `sql-ouderschapsplan-server.database.windows.net`

**Total Tables:** 23 tables + 1 view

---

## Core Tables

### dbo.dossiers
Main table for case files/dossiers.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **dossier_nummer** (nvarchar(50), NOT NULL) - Unique dossier number
- **aangemaakt_op** (datetime, NOT NULL) - Creation date
- **gewijzigd_op** (datetime, NOT NULL) - Last modified date
- **gebruiker_id** (int, NOT NULL, FK → dbo.gebruikers.id) - Mediator/user responsible
- **status** (bit, NOT NULL) - Dossier status (active/inactive)
- **is_anoniem** (bit, NULL) - Whether dossier is anonymous

### dbo.gebruikers
Users table (mediators, admins, etc.) with Auth0 integration.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **auth0_id** (nvarchar(255), NULL) - Auth0 user ID
- **email** (nvarchar(255), NULL) - Email address
- **naam** (nvarchar(255), NULL) - Full name
- **laatste_login** (datetime, NULL) - Last login timestamp
- **aangemaakt_op** (datetime, NOT NULL) - Creation date
- **gewijzigd_op** (datetime, NOT NULL) - Last modified date

### dbo.personen
Unified table for all persons (parents, children, parties).
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **voorletters** (nvarchar(10), NULL) - Initials
- **voornamen** (nvarchar(100), NULL) - First names
- **roepnaam** (nvarchar(50), NULL) - Nickname/calling name
- **geslacht** (nvarchar(10), NULL) - Gender
- **tussenvoegsel** (nvarchar(20), NULL) - Name prefix (van, de, etc.)
- **achternaam** (nvarchar(100), NOT NULL) - Last name
- **adres** (nvarchar(200), NULL) - Address
- **postcode** (nvarchar(10), NULL) - Postal code
- **plaats** (nvarchar(100), NULL) - City
- **geboorteplaats** (nvarchar(255), NULL) - Birth place (alternative column)
- **geboorte_plaats** (nvarchar(100), NULL) - Birth place (legacy column)
- **geboorte_datum** (date, NULL) - Birth date
- **nationaliteit_1** (nvarchar(50), NULL) - Primary nationality
- **nationaliteit_2** (nvarchar(50), NULL) - Secondary nationality
- **telefoon** (nvarchar(20), NULL) - Phone number
- **email** (nvarchar(100), NULL) - Email address
- **beroep** (nvarchar(100), NULL) - Profession
- **gebruiker_id** (int, NULL, FK → dbo.gebruikers.id) - Associated user
- **rol_id** (int, NULL, FK → dbo.rollen.id) - Role

---

## Junction Tables

### dbo.dossiers_partijen
Links persons to dossiers with specific roles.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **dossier_id** (int, NOT NULL, FK → dbo.dossiers.id) - Dossier reference
- **rol_id** (int, NOT NULL, FK → dbo.rollen.id) - Role in the dossier
- **persoon_id** (int, NOT NULL, FK → dbo.personen.id) - Person reference

### dbo.dossiers_kinderen
Links children to dossiers.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **dossier_id** (int, NOT NULL, FK → dbo.dossiers.id) - Dossier reference
- **kind_id** (int, NOT NULL, FK → dbo.personen.id) - Child reference

### dbo.kinderen_ouders
Defines parent-child relationships with relationship types.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **kind_id** (int, NOT NULL, FK → dbo.personen.id) - Child reference
- **ouder_id** (int, NOT NULL, FK → dbo.personen.id) - Parent reference
- **relatie_type_id** (int, NOT NULL, FK → dbo.relatie_types.id) - Type of relationship

---

## Visitation Schedule Tables (Omgang)

### dbo.omgang
Visitation/contact arrangements.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **dag_id** (int, NOT NULL, FK → dbo.dagen.id) - Day of week (1-7)
- **dagdeel_id** (int, NOT NULL, FK → dbo.dagdelen.id) - Part of day (1-4)
- **verzorger_id** (int, NOT NULL, FK → dbo.personen.id) - Caregiver
- **wissel_tijd** (nvarchar(50), NULL) - Exchange time (free text: "09:00", "8 uur", "na school")
- **week_regeling_id** (int, NOT NULL, FK → dbo.week_regelingen.id) - Week arrangement type
- **week_regeling_anders** (nvarchar(255), NULL) - Custom week arrangement override
- **dossier_id** (int, NOT NULL, FK → dbo.dossiers.id) - Related dossier
- **aangemaakt_op** (datetime, NOT NULL) - Creation date
- **gewijzigd_op** (datetime, NOT NULL) - Last modified date

### dbo.dagen
Days of the week lookup table.
- **id** (int, PK, Identity, NOT NULL) - Primary key (1-7)
- **naam** (nvarchar(20), NOT NULL, UNIQUE) - Day name (Maandag, Dinsdag, Woensdag, Donderdag, Vrijdag, Zaterdag, Zondag)

**Standard Data:**
1. Maandag
2. Dinsdag
3. Woensdag
4. Donderdag
5. Vrijdag
6. Zaterdag
7. Zondag

### dbo.dagdelen
Parts of day lookup table.
- **id** (int, PK, Identity, NOT NULL) - Primary key (1-4)
- **naam** (nvarchar(20), NOT NULL, UNIQUE) - Part name

**Standard Data:**
1. Ochtend
2. Middag
3. Avond
4. Nacht

### dbo.week_regelingen
Week arrangement types.
- **id** (int, PK, Identity, NOT NULL) - Primary key (1-9)
- **omschrijving** (nvarchar(200), NOT NULL) - Description

**Standard Data:**
1. Even weken
2. Elke week
3. Oneven weken
4. Week 1
5. Week 2
6. Week 3
7. Week 4
8. Week 5
9. Anders (use week_regeling_anders field)

### dbo.vakantie_regelingen
Vacation arrangements lookup table.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **omschrijving** (nvarchar(MAX), NOT NULL) - Description of vacation arrangement

---

## Care Arrangement Tables (Zorg)

### dbo.zorg
Care arrangements and agreements.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **zorg_categorie_id** (int, NOT NULL, FK → dbo.zorg_categorieen.id) - Care category
- **zorg_situatie_id** (int, NOT NULL, FK → dbo.zorg_situaties.id) - Care situation
- **overeenkomst** (nvarchar(MAX), NOT NULL) - Agreement text
- **situatie_anders** (nvarchar(500), NULL) - Custom situation override
- **dossier_id** (int, NOT NULL, FK → dbo.dossiers.id) - Related dossier
- **aangemaakt_op** (datetime, NOT NULL) - Creation date
- **aangemaakt_door** (int, NOT NULL, FK → dbo.gebruikers.id) - Created by user
- **gewijzigd_op** (datetime, NOT NULL) - Last modified date
- **gewijzigd_door** (int, NULL, FK → dbo.gebruikers.id) - Modified by user

### dbo.zorg_categorieen
Care categories lookup table.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **naam** (nvarchar(100), NOT NULL, UNIQUE) - Category name

### dbo.zorg_situaties
Care situations lookup table.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **naam** (nvarchar(200), NOT NULL) - Situation name
- **zorg_categorie_id** (int, NULL, FK → dbo.zorg_categorieen.id) - Related category

---

## Child Support Tables (Alimentatie)

### dbo.alimentaties
Main child support/alimony table.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **dossier_id** (int, NOT NULL, FK → dbo.dossiers.id) - Related dossier
- **netto_besteedbaar_gezinsinkomen** (decimal, NULL) - Net disposable family income
- **kosten_kinderen** (decimal, NULL) - Costs for children
- **bijdrage_kosten_kinderen** (int, NULL, FK → dbo.bijdrage_templates.id) - Contribution template
- **bijdrage_template** (int, NULL) - Template reference

### dbo.bijdrage_templates
Templates for child support contributions.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **omschrijving** (nvarchar(MAX), NULL) - Description

### dbo.bijdragen_kosten_kinderen
Individual contributions per person for child costs.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **alimentatie_id** (int, NOT NULL, FK → dbo.alimentaties.id) - Alimony reference
- **personen_id** (int, NOT NULL, FK → dbo.personen.id) - Person reference
- **eigen_aandeel** (decimal, NULL) - Own share/contribution

### dbo.financiele_afspraken_kinderen
Financial agreements per child.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **alimentatie_id** (int, NOT NULL, FK → dbo.alimentaties.id) - Alimony reference
- **kind_id** (int, NOT NULL, FK → dbo.personen.id) - Child reference
- **alimentatie_bedrag** (decimal, NULL) - Alimony amount
- **hoofdverblijf** (varchar(255), NULL) - Main residence
- **kinderbijslag_ontvanger** (varchar(255), NULL) - Child benefit receiver
- **zorgkorting_percentage** (int, NULL) - Care discount percentage
- **inschrijving** (varchar(255), NULL) - Registration
- **kindgebonden_budget** (varchar(255), NULL) - Child-related budget

---

## Parenting Plan Information

### dbo.ouderschapsplan_info
Comprehensive parenting plan information (31 columns).
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **dossier_id** (int, NULL, FK → dbo.dossiers.id) - Related dossier
- **partij_1_persoon_id** (int, NOT NULL, FK → dbo.personen.id) - First party
- **partij_2_persoon_id** (int, NOT NULL, FK → dbo.personen.id) - Second party
- **soort_relatie** (nvarchar(100), NULL) - Type of relationship
- **datum_aanvang_relatie** (date, NULL) - Start date of relationship
- **plaats_relatie** (nvarchar(255), NULL) - Place of relationship
- **soort_relatie_verbreking** (nvarchar(100), NULL) - Type of relationship breakdown
- **betrokkenheid_kind** (nvarchar(255), NULL) - Child involvement
- **kiesplan** (nvarchar(255), NULL) - Choice plan
- **gezag_partij** (tinyint, NULL) - Parental authority arrangement (1-5): 1=Joint custody, 2=Party 1 sole custody (permanent), 3=Party 2 sole custody (permanent), 4=Party 1 sole custody (joint arrangement planned), 5=Party 2 sole custody (joint arrangement planned)
- **gezag_termijn_weken** (int, NULL) - Number of weeks to arrange joint parental authority (only used when gezag_partij = 4 or 5)
- **woonplaats_optie** (tinyint, NULL) - Residence arrangement after separation (1-5): 1=Stays the same, 2=Party 1 moves to different place, 3=Party 2 moves to different place, 4=Both move to different places, 5=Still unclear
- **woonplaats_partij1** (nvarchar(100), NULL) - Future residence of party 1 (only relevant when woonplaats_optie = 2 or 4)
- **woonplaats_partij2** (nvarchar(100), NULL) - Future residence of party 2 (only relevant when woonplaats_optie = 3 or 4)
- **wa_op_naam_van_partij** (tinyint, NULL) - Car insurance in name of party
- **keuze_devices** (nvarchar(MAX), NULL) - Device choices
- **zorgverzekering_op_naam_van_partij** (tinyint, NULL) - Health insurance in name of party
- **kinderbijslag_partij** (tinyint, NULL) - Child benefit party (1 or 2)
- **brp_partij_1** (nvarchar(MAX), NULL) - BRP (civil registry) for party 1
- **brp_partij_2** (nvarchar(MAX), NULL) - BRP for party 2
- **kgb_partij_1** (nvarchar(MAX), NULL) - Child-related budget for party 1
- **kgb_partij_2** (nvarchar(MAX), NULL) - Child-related budget for party 2
- **hoofdverblijf** (nvarchar(100), NULL) - Main residence
- **zorgverdeling** (nvarchar(100), NULL) - Care distribution
- **opvang_kinderen** (nvarchar(255), NULL) - Childcare
- **bankrekeningnummers_op_naam_van_kind** (nvarchar(MAX), NULL) - Bank accounts in child's name (V6: JSON array of {iban, tenaamstelling, bankNaam})
- **parenting_coordinator** (nvarchar(255), NULL) - Parenting coordinator
- **overeenkomst_gemaakt** (bit, NULL) - Agreement made (yes/no)
- **created_at** (datetime2, NULL) - Creation timestamp
- **updated_at** (datetime2, NULL) - Last update timestamp

---

## Lookup Tables

### dbo.rollen
Roles for persons in dossiers.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **naam** (nvarchar(50), NULL) - Role name

### dbo.relatie_types
Types of parent-child relationships.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **naam** (nvarchar(50), NULL) - Relationship type name

### dbo.regelingen_templates
Templates for custody and visitation arrangements.
- **id** (int, PK, Identity, NOT NULL) - Primary key
- **template_naam** (nvarchar(100), NOT NULL) - Template identifier (e.g., partij1, partij2, partij1_even)
- **template_tekst** (nvarchar(MAX), NOT NULL) - Template text with placeholders (e.g., {KIND}, {PARTIJ1}, {FEESTDAG})
- **meervoud_kinderen** (bit, NOT NULL) - Whether the template is for multiple children (singular vs plural)
- **type** (nvarchar(20), NOT NULL) - Template type (Feestdag, Vakantie)

---

## Database Views

### vw_omgang_schedule
View that provides a readable omgang schedule with all related information joined.
- **id** (int, NOT NULL) - Omgang ID
- **dag** (nvarchar(20), NOT NULL) - Day name
- **dagdeel** (nvarchar(20), NOT NULL) - Part of day name
- **verzorger** (nvarchar(201), NULL) - Caregiver full name
- **wissel_tijd** (nvarchar(50), NULL) - Exchange time
- **week_regeling** (nvarchar(200), NOT NULL) - Week arrangement
- **week_regeling_anders** (nvarchar(255), NULL) - Custom arrangement
- **effectieve_regeling** (nvarchar(255), NULL) - Effective arrangement (uses anders if set)
- **dossier_id** (int, NOT NULL) - Related dossier

---

## Foreign Key Relationships

### Dossier Relationships
- `dossiers.gebruiker_id` → `gebruikers.id`
- `dossiers_partijen.dossier_id` → `dossiers.id`
- `dossiers_partijen.rol_id` → `rollen.id`
- `dossiers_partijen.persoon_id` → `personen.id`
- `dossiers_kinderen.dossier_id` → `dossiers.id`
- `dossiers_kinderen.kind_id` → `personen.id`

### Person Relationships
- `kinderen_ouders.kind_id` → `personen.id`
- `kinderen_ouders.ouder_id` → `personen.id`
- `kinderen_ouders.relatie_type_id` → `relatie_types.id`
- `personen.gebruiker_id` → `gebruikers.id`
- `personen.rol_id` → `rollen.id`

### Visitation Relationships
- `omgang.dag_id` → `dagen.id`
- `omgang.dagdeel_id` → `dagdelen.id`
- `omgang.verzorger_id` → `personen.id`
- `omgang.week_regeling_id` → `week_regelingen.id`
- `omgang.dossier_id` → `dossiers.id`

### Care Arrangement Relationships
- `zorg.zorg_categorie_id` → `zorg_categorieen.id`
- `zorg.zorg_situatie_id` → `zorg_situaties.id`
- `zorg.dossier_id` → `dossiers.id`
- `zorg.aangemaakt_door` → `gebruikers.id`
- `zorg.gewijzigd_door` → `gebruikers.id`
- `zorg_situaties.zorg_categorie_id` → `zorg_categorieen.id`

### Alimentatie Relationships
- `alimentaties.dossier_id` → `dossiers.id`
- `alimentaties.bijdrage_kosten_kinderen` → `bijdrage_templates.id`
- `bijdragen_kosten_kinderen.alimentatie_id` → `alimentaties.id`
- `bijdragen_kosten_kinderen.personen_id` → `personen.id`
- `financiele_afspraken_kinderen.alimentatie_id` → `alimentaties.id`
- `financiele_afspraken_kinderen.kind_id` → `personen.id`

### Ouderschapsplan Relationships
- `ouderschapsplan_info.dossier_id` → `dossiers.id`
- `ouderschapsplan_info.partij_1_persoon_id` → `personen.id`
- `ouderschapsplan_info.partij_2_persoon_id` → `personen.id`

---

## Business Rules

1. **Override Fields**: Both `omgang.week_regeling_anders` and `zorg.situatie_anders` are used when the standard options don't fit (when "Anders" is selected)
2. **Audit Trail**: Most tables include `aangemaakt_op` and `gewijzigd_op` for tracking changes
3. **Auth0 Integration**: The `gebruikers` table includes `auth0_id` for Auth0 integration
4. **Unified Person Model**: All persons (children, parents, parties) are stored in the `personen` table with relationships defined in junction tables
5. **Free Text Time**: `omgang.wissel_tijd` accepts any string (not just HH:MM format) - allows "8 uur", "na school", etc.
6. **Multi-Tenant**: All dossiers are scoped to `gebruiker_id` for data isolation

---

## Important Notes

⚠️ **Table Naming Convention:**
- **ALL lookup tables use PLURAL names** (dagen, dagdelen, week_regelingen, alimentaties)
- This is critical for queries and foreign key relationships
- Previous documentation had some singular names which were incorrect

⚠️ **Legacy Columns:**
- `personen.geboorteplaats` and `personen.geboorte_plaats` both exist (likely migration artifact)
- Use `geboorteplaats` for new code

⚠️ **View vs Table:**
- `vw_omgang_schedule` is a VIEW (not a table) - use for read-only queries

---

## Common Queries

### Get all children in a dossier
```sql
SELECT p.*
FROM personen p
INNER JOIN dossiers_kinderen dk ON p.id = dk.kind_id
WHERE dk.dossier_id = @dossier_id;
```

### Get visitation schedule for a dossier (using view)
```sql
SELECT *
FROM vw_omgang_schedule
WHERE dossier_id = @dossier_id
ORDER BY id;
```

### Get visitation schedule for a dossier (manual join)
```sql
SELECT
    d.naam AS dag,
    dd.naam AS dagdeel,
    p.voornamen + ' ' + ISNULL(p.tussenvoegsel + ' ', '') + p.achternaam AS verzorger,
    o.wissel_tijd,
    COALESCE(o.week_regeling_anders, wr.omschrijving) AS regeling
FROM omgang o
INNER JOIN dagen d ON o.dag_id = d.id
INNER JOIN dagdelen dd ON o.dagdeel_id = dd.id
INNER JOIN personen p ON o.verzorger_id = p.id
INNER JOIN week_regelingen wr ON o.week_regeling_id = wr.id
WHERE o.dossier_id = @dossier_id
ORDER BY d.id, dd.id;
```

### Get care arrangements for a dossier
```sql
SELECT
    zc.naam AS categorie,
    COALESCE(z.situatie_anders, zs.naam) AS situatie,
    z.overeenkomst
FROM zorg z
INNER JOIN zorg_categorieen zc ON z.zorg_categorie_id = zc.id
INNER JOIN zorg_situaties zs ON z.zorg_situatie_id = zs.id
WHERE z.dossier_id = @dossier_id
ORDER BY zc.naam, zs.naam;
```

### Get complete parenting plan information
```sql
SELECT
    opi.*,
    p1.voornamen + ' ' + p1.achternaam AS partij_1_naam,
    p2.voornamen + ' ' + p2.achternaam AS partij_2_naam,
    d.dossier_nummer
FROM ouderschapsplan_info opi
INNER JOIN personen p1 ON opi.partij_1_persoon_id = p1.id
INNER JOIN personen p2 ON opi.partij_2_persoon_id = p2.id
INNER JOIN dossiers d ON opi.dossier_id = d.id
WHERE opi.dossier_id = @dossier_id;
```

### Get alimentatie with financial agreements per child
```sql
SELECT
    a.*,
    fak.kind_id,
    p.voornamen + ' ' + p.achternaam AS kind_naam,
    fak.alimentatie_bedrag,
    fak.hoofdverblijf,
    fak.kinderbijslag_ontvanger
FROM alimentaties a
LEFT JOIN financiele_afspraken_kinderen fak ON a.id = fak.alimentatie_id
LEFT JOIN personen p ON fak.kind_id = p.id
WHERE a.dossier_id = @dossier_id;
```

---

**Schema Version:** 1.1.0
**Last Verified:** 2025-10-21 at 00:24 UTC
**Verified By:** Direct Azure SQL Database query
