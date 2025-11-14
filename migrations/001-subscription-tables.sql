-- ===================================================================
-- Mollie Subscriptions Migration
-- Created: 2025-11-14
-- Description: Database schema for subscription and payment management
-- ===================================================================

-- ===================================================================
-- 1. ABONNEMENTEN TABLE
-- ===================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'abonnementen')
BEGIN
    CREATE TABLE dbo.abonnementen (
        id INT IDENTITY(1,1) PRIMARY KEY,
        gebruiker_id INT NOT NULL,
        mollie_customer_id NVARCHAR(50) NULL UNIQUE,
        mollie_subscription_id NVARCHAR(50) NULL UNIQUE,
        mollie_mandate_id NVARCHAR(50) NULL,
        plan_type NVARCHAR(20) NOT NULL DEFAULT 'basic',
        status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- 'active', 'canceled', 'suspended', 'pending'
        start_datum DATE NOT NULL,
        eind_datum DATE NULL,
        trial_eind_datum DATE NULL,
        maandelijks_bedrag DECIMAL(10,2) NOT NULL DEFAULT 19.99,
        volgende_betaling DATE NULL,
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        gewijzigd_op DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_abonnementen_gebruiker FOREIGN KEY (gebruiker_id)
            REFERENCES dbo.gebruikers(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_abonnementen_gebruiker ON dbo.abonnementen(gebruiker_id);
    CREATE INDEX IX_abonnementen_mollie_customer ON dbo.abonnementen(mollie_customer_id);
    CREATE INDEX IX_abonnementen_mollie_subscription ON dbo.abonnementen(mollie_subscription_id);
    CREATE INDEX IX_abonnementen_status ON dbo.abonnementen(status);

    PRINT 'Table dbo.abonnementen created successfully';
END
ELSE
BEGIN
    PRINT 'Table dbo.abonnementen already exists';
END
GO

-- ===================================================================
-- 2. BETALINGEN TABLE
-- ===================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'betalingen')
BEGIN
    CREATE TABLE dbo.betalingen (
        id INT IDENTITY(1,1) PRIMARY KEY,
        abonnement_id INT NOT NULL,
        mollie_payment_id NVARCHAR(50) NULL UNIQUE,
        mollie_invoice_id NVARCHAR(50) NULL,
        bedrag DECIMAL(10,2) NOT NULL,
        btw_bedrag DECIMAL(10,2) NOT NULL DEFAULT 0,
        status NVARCHAR(20) NOT NULL DEFAULT 'pending', -- 'paid', 'failed', 'pending', 'open'
        factuur_pdf_url NVARCHAR(500) NULL,
        betaal_datum DATETIME NULL,
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_betalingen_abonnement FOREIGN KEY (abonnement_id)
            REFERENCES dbo.abonnementen(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_betalingen_abonnement ON dbo.betalingen(abonnement_id);
    CREATE INDEX IX_betalingen_mollie_payment ON dbo.betalingen(mollie_payment_id);
    CREATE INDEX IX_betalingen_status ON dbo.betalingen(status);

    PRINT 'Table dbo.betalingen created successfully';
END
ELSE
BEGIN
    PRINT 'Table dbo.betalingen already exists';
END
GO

-- ===================================================================
-- 3. EXTEND GEBRUIKERS TABLE
-- ===================================================================
-- Add has_active_subscription column
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.gebruikers')
    AND name = 'has_active_subscription'
)
BEGIN
    ALTER TABLE dbo.gebruikers
    ADD has_active_subscription BIT DEFAULT 0;

    PRINT 'Column has_active_subscription added to dbo.gebruikers';
END
ELSE
BEGIN
    PRINT 'Column has_active_subscription already exists in dbo.gebruikers';
END
GO

-- Add btw_nummer column
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.gebruikers')
    AND name = 'btw_nummer'
)
BEGIN
    ALTER TABLE dbo.gebruikers
    ADD btw_nummer NVARCHAR(50) NULL;

    PRINT 'Column btw_nummer added to dbo.gebruikers';
END
ELSE
BEGIN
    PRINT 'Column btw_nummer already exists in dbo.gebruikers';
END
GO

-- Add bedrijfsnaam column
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.gebruikers')
    AND name = 'bedrijfsnaam'
)
BEGIN
    ALTER TABLE dbo.gebruikers
    ADD bedrijfsnaam NVARCHAR(255) NULL;

    PRINT 'Column bedrijfsnaam added to dbo.gebruikers';
END
ELSE
BEGIN
    PRINT 'Column bedrijfsnaam already exists in dbo.gebruikers';
END
GO

-- Add is_zakelijk column
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.gebruikers')
    AND name = 'is_zakelijk'
)
BEGIN
    ALTER TABLE dbo.gebruikers
    ADD is_zakelijk BIT DEFAULT 0;

    PRINT 'Column is_zakelijk added to dbo.gebruikers';
END
ELSE
BEGIN
    PRINT 'Column is_zakelijk already exists in dbo.gebruikers';
END
GO

-- Create index on has_active_subscription
IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE name = 'IX_gebruikers_subscription'
    AND object_id = OBJECT_ID('dbo.gebruikers')
)
BEGIN
    CREATE INDEX IX_gebruikers_subscription ON dbo.gebruikers(has_active_subscription);
    PRINT 'Index IX_gebruikers_subscription created';
END
ELSE
BEGIN
    PRINT 'Index IX_gebruikers_subscription already exists';
END
GO

-- ===================================================================
-- VERIFICATION
-- ===================================================================
PRINT '';
PRINT '=================================================================';
PRINT 'MIGRATION COMPLETED - VERIFICATION';
PRINT '=================================================================';

SELECT
    'abonnementen' as TableName,
    COUNT(*) as RecordCount
FROM dbo.abonnementen
UNION ALL
SELECT
    'betalingen' as TableName,
    COUNT(*) as RecordCount
FROM dbo.betalingen;

SELECT
    name as ColumnName,
    TYPE_NAME(system_type_id) as DataType
FROM sys.columns
WHERE object_id = OBJECT_ID('dbo.gebruikers')
AND name IN ('has_active_subscription', 'btw_nummer', 'bedrijfsnaam', 'is_zakelijk');

PRINT '';
PRINT 'Migration 001-subscription-tables.sql completed successfully!';
PRINT '=================================================================';
