-- Migration 006: Voucher/Kortingscode Systeem
-- Flexibel systeem voor testers, verenigingskorting, promotiecodes

-- =====================================================
-- Stap 1: Hoofdtabel voor vouchers
-- =====================================================
CREATE TABLE dbo.vouchers (
    id INT IDENTITY(1,1) PRIMARY KEY,

    -- Identificatie
    code NVARCHAR(50) UNIQUE NOT NULL,           -- "TESTER2025", "VFAS20", "GRATIS-HANS"
    naam NVARCHAR(100) NOT NULL,                  -- "Tester toegang", "VFAS ledenkorting"
    omschrijving NVARCHAR(500) NULL,              -- Interne notitie

    -- Type en waarde
    -- Types: 'gratis', 'percentage', 'maanden_gratis', 'vast_bedrag'
    type NVARCHAR(20) NOT NULL,
    waarde DECIMAL(10,2) NULL,                    -- 100 (voor %), 2 (voor maanden), 5.00 (voor vast bedrag)

    -- Beperkingen
    max_gebruik INT NULL,                         -- NULL = onbeperkt, 1 = eenmalig, 100 = max 100x
    max_per_gebruiker INT DEFAULT 1,              -- Hoeveel keer dezelfde user mag gebruiken

    -- Geldigheid
    geldig_van DATETIME DEFAULT GETDATE(),
    geldig_tot DATETIME NULL,                     -- NULL = geen einddatum
    is_actief BIT DEFAULT 1 NOT NULL,             -- Handmatige aan/uit schakelaar

    -- Tracking
    aantal_gebruikt INT DEFAULT 0,
    aangemaakt_op DATETIME DEFAULT GETDATE(),
    gewijzigd_op DATETIME DEFAULT GETDATE(),

    -- Constraints
    CONSTRAINT CK_vouchers_type CHECK (type IN ('gratis', 'percentage', 'maanden_gratis', 'vast_bedrag')),
    CONSTRAINT CK_vouchers_waarde CHECK (
        (type = 'gratis' AND waarde IS NULL) OR
        (type = 'percentage' AND waarde > 0 AND waarde <= 100) OR
        (type = 'maanden_gratis' AND waarde > 0) OR
        (type = 'vast_bedrag' AND waarde > 0)
    )
);
GO

-- Index voor snelle code lookup (alleen actieve vouchers)
CREATE INDEX IX_vouchers_code_actief ON dbo.vouchers(code) WHERE is_actief = 1;
GO

-- =====================================================
-- Stap 2: Tabel voor voucher gebruik tracking
-- =====================================================
CREATE TABLE dbo.voucher_gebruik (
    id INT IDENTITY(1,1) PRIMARY KEY,
    voucher_id INT NOT NULL REFERENCES dbo.vouchers(id),
    gebruiker_id INT NOT NULL REFERENCES dbo.gebruikers(id),
    abonnement_id INT NULL REFERENCES dbo.abonnementen(id),

    -- Details van toepassing
    korting_toegepast DECIMAL(10,2) NULL,         -- Daadwerkelijke korting in euro's

    gebruikt_op DATETIME DEFAULT GETDATE(),

    -- Voorkom dubbel gebruik per abonnement
    CONSTRAINT UQ_voucher_gebruiker_abonnement UNIQUE (voucher_id, gebruiker_id, abonnement_id)
);
GO

-- Index voor snelle lookup per gebruiker
CREATE INDEX IX_voucher_gebruik_gebruiker ON dbo.voucher_gebruik(gebruiker_id);
GO

-- =====================================================
-- Stap 3: Uitbreiding dbo.abonnementen voor voucher support
-- =====================================================
ALTER TABLE dbo.abonnementen ADD
    voucher_id INT NULL REFERENCES dbo.vouchers(id),
    voucher_code NVARCHAR(50) NULL,               -- Bewaar code voor historie
    is_gratis_via_voucher BIT DEFAULT 0 NOT NULL; -- Skip Mollie volledig
GO

-- =====================================================
-- Stap 4: Voorbeeldvouchers invoegen
-- =====================================================

-- Tester: volledig gratis, onbeperkt gebruik
INSERT INTO dbo.vouchers (code, naam, type, max_gebruik, is_actief, omschrijving)
VALUES ('TESTER2025', 'Tester toegang 2025', 'gratis', NULL, 1, 'Algemene tester code voor 2025');

-- Lancering actie: eerste 2 maanden gratis (verlopen op 31 maart 2025)
INSERT INTO dbo.vouchers (code, naam, type, waarde, geldig_tot, max_gebruik, omschrijving)
VALUES ('LANCERING2025', 'Lanceringsactie 2025', 'maanden_gratis', 2, '2025-03-31 23:59:59', 100, 'Lanceringsactie - eerste 2 maanden gratis');

GO

-- =====================================================
-- Verificatie
-- =====================================================
-- SELECT * FROM dbo.vouchers;
-- SELECT
--     c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE, c.COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS c
-- WHERE c.TABLE_NAME = 'abonnementen'
-- AND c.COLUMN_NAME IN ('voucher_id', 'voucher_code', 'is_gratis_via_voucher');
