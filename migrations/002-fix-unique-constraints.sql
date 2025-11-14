-- ===================================================================
-- Fix UNIQUE constraints to allow multiple NULL values
-- Created: 2025-11-14
-- Description: Drop and recreate UNIQUE constraints with WHERE clause
-- ===================================================================

-- Drop existing UNIQUE constraints
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ__abonneme__A8CE22037455B74D' AND object_id = OBJECT_ID('dbo.abonnementen'))
BEGIN
    ALTER TABLE dbo.abonnementen DROP CONSTRAINT UQ__abonneme__A8CE22037455B74D;
    PRINT 'Dropped UNIQUE constraint on mollie_customer_id';
END

-- Find and drop any other UNIQUE constraints on mollie_subscription_id
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = name
FROM sys.indexes
WHERE object_id = OBJECT_ID('dbo.abonnementen')
  AND name LIKE '%mollie_subscription%'
  AND is_unique = 1;

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE dbo.abonnementen DROP CONSTRAINT ' + @constraintName);
    PRINT 'Dropped UNIQUE constraint on mollie_subscription_id';
END

-- Create filtered UNIQUE indexes (allows multiple NULLs)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_abonnementen_mollie_customer' AND object_id = OBJECT_ID('dbo.abonnementen'))
BEGIN
    CREATE UNIQUE INDEX UQ_abonnementen_mollie_customer
    ON dbo.abonnementen(mollie_customer_id)
    WHERE mollie_customer_id IS NOT NULL;
    PRINT 'Created filtered UNIQUE index on mollie_customer_id';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_abonnementen_mollie_subscription' AND object_id = OBJECT_ID('dbo.abonnementen'))
BEGIN
    CREATE UNIQUE INDEX UQ_abonnementen_mollie_subscription
    ON dbo.abonnementen(mollie_subscription_id)
    WHERE mollie_subscription_id IS NOT NULL;
    PRINT 'Created filtered UNIQUE index on mollie_subscription_id';
END

PRINT 'Migration 002 completed successfully!';
