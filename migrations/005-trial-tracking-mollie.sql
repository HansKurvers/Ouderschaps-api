-- Migration 005: Trial Tracking met Mollie Customer ID
-- Voorkomt trial misbruik door gebruikers te tracken en Mollie customers te hergebruiken

-- Stap 1: Voeg mollie_customer_id en trial tracking velden toe aan gebruikers tabel
-- Dit zorgt ervoor dat elke gebruiker permanent gekoppeld is aan één Mollie customer
ALTER TABLE dbo.gebruikers ADD
    mollie_customer_id NVARCHAR(50) NULL,
    trial_used BIT DEFAULT 0 NOT NULL,
    eerste_subscription_datum DATETIME NULL;
GO

-- Stap 2: Index voor unieke Mollie customers (één customer per gebruiker)
CREATE UNIQUE INDEX UQ_gebruikers_mollie_customer
ON dbo.gebruikers(mollie_customer_id)
WHERE mollie_customer_id IS NOT NULL;
GO

-- Stap 3: Backfill bestaande data vanuit abonnementen tabel
-- Markeer bestaande gebruikers die al een subscription hebben gehad als trial_used
UPDATE g
SET
    g.mollie_customer_id = a.mollie_customer_id,
    g.trial_used = 1,
    g.eerste_subscription_datum = a.start_datum
FROM dbo.gebruikers g
INNER JOIN (
    SELECT
        gebruiker_id,
        mollie_customer_id,
        start_datum,
        ROW_NUMBER() OVER (PARTITION BY gebruiker_id ORDER BY aangemaakt_op ASC) AS rn
    FROM dbo.abonnementen
    WHERE mollie_customer_id IS NOT NULL
) a ON g.id = a.gebruiker_id AND a.rn = 1
WHERE g.mollie_customer_id IS NULL;
GO

-- Stap 4: Markeer ook gebruikers als trial_used die wel een subscription hebben maar zonder mollie_customer_id
-- (voor het geval er oude records zijn zonder mollie_customer_id)
UPDATE g
SET
    g.trial_used = 1,
    g.eerste_subscription_datum = a.start_datum
FROM dbo.gebruikers g
INNER JOIN (
    SELECT
        gebruiker_id,
        start_datum,
        ROW_NUMBER() OVER (PARTITION BY gebruiker_id ORDER BY aangemaakt_op ASC) AS rn
    FROM dbo.abonnementen
) a ON g.id = a.gebruiker_id AND a.rn = 1
WHERE g.eerste_subscription_datum IS NULL;
GO

-- Verificatie query (run handmatig om te controleren)
-- SELECT
--     g.id, g.email, g.mollie_customer_id, g.trial_used, g.eerste_subscription_datum,
--     COUNT(a.id) as subscription_count
-- FROM dbo.gebruikers g
-- LEFT JOIN dbo.abonnementen a ON g.id = a.gebruiker_id
-- GROUP BY g.id, g.email, g.mollie_customer_id, g.trial_used, g.eerste_subscription_datum
-- ORDER BY subscription_count DESC;
