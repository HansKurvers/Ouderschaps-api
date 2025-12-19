-- =====================================================
-- MIGRATIE: Berichten & Communicatie Systeem
-- Datum: 2024-12-19
-- =====================================================

-- =====================================================
-- 1. BERICHT TEMPLATES (herbruikbare sjablonen)
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bericht_templates')
BEGIN
    CREATE TABLE bericht_templates (
        id INT IDENTITY(1,1) PRIMARY KEY,
        gebruiker_id INT,                            -- NULL = systeem template, anders user-specifiek
        naam NVARCHAR(100) NOT NULL,
        onderwerp NVARCHAR(200) NOT NULL,
        inhoud NVARCHAR(MAX) NOT NULL,
        is_systeem_template BIT DEFAULT 0,
        categorie NVARCHAR(50),                      -- 'herinnering', 'update', 'vraag', 'afspraak', 'algemeen'
        actief BIT DEFAULT 1,
        volgorde INT DEFAULT 0,
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        gewijzigd_op DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_bericht_templates_gebruiker FOREIGN KEY (gebruiker_id)
            REFERENCES gebruikers(id)
    );

    -- Index voor gebruiker templates
    CREATE INDEX IX_bericht_templates_gebruiker ON bericht_templates(gebruiker_id, actief);

    PRINT 'Table bericht_templates created';
END
ELSE
    PRINT 'Table bericht_templates already exists';
GO

-- =====================================================
-- 2. DOSSIER BERICHTEN (hoofdberichten)
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dossier_berichten')
BEGIN
    CREATE TABLE dossier_berichten (
        id INT IDENTITY(1,1) PRIMARY KEY,
        dossier_id INT NOT NULL,

        -- Inhoud
        onderwerp NVARCHAR(200) NOT NULL,
        inhoud NVARCHAR(MAX) NOT NULL,

        -- Afzender (een van beide is gevuld)
        verzonden_door_gebruiker_id INT,             -- Eigenaar/mediator
        verzonden_door_gast_id INT,                  -- Gast/partij

        -- Eigenschappen
        is_urgent BIT DEFAULT 0,
        is_vastgepind BIT DEFAULT 0,                 -- Toon bovenaan

        -- Status
        email_notificatie_verzonden BIT DEFAULT 0,
        email_verzonden_op DATETIME,

        -- Timestamps
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        gewijzigd_op DATETIME DEFAULT GETDATE(),
        verwijderd_op DATETIME,                      -- Soft delete

        CONSTRAINT FK_berichten_dossier FOREIGN KEY (dossier_id)
            REFERENCES dossiers(id) ON DELETE CASCADE,
        CONSTRAINT FK_berichten_gebruiker FOREIGN KEY (verzonden_door_gebruiker_id)
            REFERENCES gebruikers(id),
        CONSTRAINT FK_berichten_gast FOREIGN KEY (verzonden_door_gast_id)
            REFERENCES dossier_gasten(id),
        CONSTRAINT CHK_berichten_afzender CHECK (
            (verzonden_door_gebruiker_id IS NOT NULL AND verzonden_door_gast_id IS NULL) OR
            (verzonden_door_gebruiker_id IS NULL AND verzonden_door_gast_id IS NOT NULL)
        )
    );

    -- Indexes
    CREATE INDEX IX_berichten_dossier ON dossier_berichten(dossier_id, aangemaakt_op DESC);
    CREATE INDEX IX_berichten_urgent ON dossier_berichten(dossier_id, is_urgent, aangemaakt_op DESC);

    PRINT 'Table dossier_berichten created';
END
ELSE
    PRINT 'Table dossier_berichten already exists';
GO

-- =====================================================
-- 3. BERICHT BIJLAGEN (koppeling met documenten)
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dossier_bericht_bijlagen')
BEGIN
    CREATE TABLE dossier_bericht_bijlagen (
        id INT IDENTITY(1,1) PRIMARY KEY,
        bericht_id INT NOT NULL,
        document_id INT NOT NULL,
        volgorde INT DEFAULT 0,
        aangemaakt_op DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_bericht_bijlagen_bericht FOREIGN KEY (bericht_id)
            REFERENCES dossier_berichten(id) ON DELETE CASCADE,
        CONSTRAINT FK_bericht_bijlagen_document FOREIGN KEY (document_id)
            REFERENCES dossier_documenten(id),
        CONSTRAINT UQ_bericht_document UNIQUE (bericht_id, document_id)
    );

    PRINT 'Table dossier_bericht_bijlagen created';
END
ELSE
    PRINT 'Table dossier_bericht_bijlagen already exists';
GO

-- =====================================================
-- 4. BERICHT GELEZEN STATUS
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dossier_bericht_gelezen')
BEGIN
    CREATE TABLE dossier_bericht_gelezen (
        id INT IDENTITY(1,1) PRIMARY KEY,
        bericht_id INT NOT NULL,

        -- Wie heeft gelezen (een van beide is gevuld)
        gelezen_door_gebruiker_id INT,
        gelezen_door_gast_id INT,

        -- Wanneer
        gelezen_op DATETIME DEFAULT GETDATE(),

        CONSTRAINT FK_gelezen_bericht FOREIGN KEY (bericht_id)
            REFERENCES dossier_berichten(id) ON DELETE CASCADE,
        CONSTRAINT FK_gelezen_gebruiker FOREIGN KEY (gelezen_door_gebruiker_id)
            REFERENCES gebruikers(id),
        CONSTRAINT FK_gelezen_gast FOREIGN KEY (gelezen_door_gast_id)
            REFERENCES dossier_gasten(id),
        CONSTRAINT CHK_gelezen_door CHECK (
            (gelezen_door_gebruiker_id IS NOT NULL AND gelezen_door_gast_id IS NULL) OR
            (gelezen_door_gebruiker_id IS NULL AND gelezen_door_gast_id IS NOT NULL)
        )
    );

    -- Index voor snelle lookup
    CREATE INDEX IX_gelezen_bericht ON dossier_bericht_gelezen(bericht_id);
    -- Unieke constraints voor een gelezen-record per persoon per bericht
    CREATE UNIQUE INDEX IX_gelezen_gebruiker ON dossier_bericht_gelezen(bericht_id, gelezen_door_gebruiker_id)
        WHERE gelezen_door_gebruiker_id IS NOT NULL;
    CREATE UNIQUE INDEX IX_gelezen_gast ON dossier_bericht_gelezen(bericht_id, gelezen_door_gast_id)
        WHERE gelezen_door_gast_id IS NOT NULL;

    PRINT 'Table dossier_bericht_gelezen created';
END
ELSE
    PRINT 'Table dossier_bericht_gelezen already exists';
GO

-- =====================================================
-- 5. BERICHT REACTIES
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dossier_bericht_reacties')
BEGIN
    CREATE TABLE dossier_bericht_reacties (
        id INT IDENTITY(1,1) PRIMARY KEY,
        bericht_id INT NOT NULL,

        -- Inhoud
        inhoud NVARCHAR(MAX) NOT NULL,

        -- Afzender (een van beide is gevuld)
        reactie_door_gebruiker_id INT,
        reactie_door_gast_id INT,

        -- Timestamps
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        gewijzigd_op DATETIME DEFAULT GETDATE(),
        verwijderd_op DATETIME,                      -- Soft delete

        CONSTRAINT FK_reacties_bericht FOREIGN KEY (bericht_id)
            REFERENCES dossier_berichten(id) ON DELETE CASCADE,
        CONSTRAINT FK_reacties_gebruiker FOREIGN KEY (reactie_door_gebruiker_id)
            REFERENCES gebruikers(id),
        CONSTRAINT FK_reacties_gast FOREIGN KEY (reactie_door_gast_id)
            REFERENCES dossier_gasten(id),
        CONSTRAINT CHK_reacties_afzender CHECK (
            (reactie_door_gebruiker_id IS NOT NULL AND reactie_door_gast_id IS NULL) OR
            (reactie_door_gebruiker_id IS NULL AND reactie_door_gast_id IS NOT NULL)
        )
    );

    -- Index voor bericht reacties
    CREATE INDEX IX_reacties_bericht ON dossier_bericht_reacties(bericht_id, aangemaakt_op);

    PRINT 'Table dossier_bericht_reacties created';
END
ELSE
    PRINT 'Table dossier_bericht_reacties already exists';
GO

-- =====================================================
-- 6. EMAIL NOTIFICATIE LOG
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bericht_email_log')
BEGIN
    CREATE TABLE bericht_email_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        bericht_id INT,
        reactie_id INT,

        -- Ontvanger
        verzonden_naar_email NVARCHAR(255) NOT NULL,
        verzonden_naar_naam NVARCHAR(255),

        -- Status
        sendgrid_message_id NVARCHAR(100),
        status NVARCHAR(50) DEFAULT 'pending',       -- 'pending', 'sent', 'delivered', 'failed'
        error_message NVARCHAR(500),

        -- Timestamps
        aangemaakt_op DATETIME DEFAULT GETDATE(),
        verzonden_op DATETIME,

        CONSTRAINT FK_email_log_bericht FOREIGN KEY (bericht_id)
            REFERENCES dossier_berichten(id),
        CONSTRAINT FK_email_log_reactie FOREIGN KEY (reactie_id)
            REFERENCES dossier_bericht_reacties(id)
    );

    PRINT 'Table bericht_email_log created';
END
ELSE
    PRINT 'Table bericht_email_log already exists';
GO

-- =====================================================
-- 7. SEED DATA: SYSTEEM TEMPLATES
-- =====================================================

-- Alleen inserten als er nog geen systeem templates zijn
IF NOT EXISTS (SELECT 1 FROM bericht_templates WHERE is_systeem_template = 1)
BEGIN
    INSERT INTO bericht_templates (naam, onderwerp, inhoud, is_systeem_template, categorie, volgorde)
    VALUES
    -- Herinneringen
    ('Herinnering documenten',
     'Herinnering: documenten aanleveren',
     'Beste {partij_naam},

Vriendelijk verzoek om de nog ontbrekende documenten aan te leveren voor ons dossier.

U kunt de documenten eenvoudig uploaden via de Document Portal.

Mocht u vragen hebben, dan hoor ik het graag.

Met vriendelijke groet,
{mediator_naam}',
     1, 'herinnering', 1),

    ('Herinnering afspraak',
     'Herinnering: afspraak op {datum}',
     'Beste {partij_naam},

Hierbij herinner ik u aan onze afspraak:

Datum: {datum}
Tijd: {tijd}
Locatie: {locatie}

Mocht u verhinderd zijn, laat het mij dan zo spoedig mogelijk weten.

Met vriendelijke groet,
{mediator_naam}',
     1, 'herinnering', 2),

    -- Updates
    ('Document gereed',
     'Document gereed ter review: {document_naam}',
     'Beste {partij_naam},

Het document "{document_naam}" staat klaar ter review.

Graag ontvang ik uw feedback voor {deadline}. U kunt het document bekijken in de Document Portal en daar ook direct reageren.

Met vriendelijke groet,
{mediator_naam}',
     1, 'update', 3),

    ('Concept convenant gereed',
     'Concept echtscheidingsconvenant gereed',
     'Beste {partij_naam},

Hierbij ontvangt u het concept echtscheidingsconvenant ter review.

Ik verzoek u het document zorgvuldig door te nemen en eventuele opmerkingen of correcties via de portal door te geven.

Graag uw reactie voor {deadline}.

Met vriendelijke groet,
{mediator_naam}',
     1, 'update', 4),

    ('Concept ouderschapsplan gereed',
     'Concept ouderschapsplan gereed',
     'Beste {partij_naam},

Het concept ouderschapsplan is gereed en beschikbaar in de Document Portal.

Graag verzoek ik u beiden het document door te nemen en eventuele opmerkingen te plaatsen. Let in het bijzonder op:
- De zorgverdeling (artikel 3)
- De vakantieregelingen (artikel 5)
- De financiele afspraken (artikel 6)

Deadline voor feedback: {deadline}

Met vriendelijke groet,
{mediator_naam}',
     1, 'update', 5),

    -- Vragen
    ('Vraag informatie',
     'Vraag over uw dossier',
     'Beste {partij_naam},

Voor de voortgang van uw dossier heb ik de volgende informatie nodig:

{vraag}

Kunt u dit zo spoedig mogelijk aanleveren of via de portal reageren?

Met vriendelijke groet,
{mediator_naam}',
     1, 'vraag', 6),

    -- Afspraken
    ('Nieuwe afspraak',
     'Uitnodiging: mediationgesprek op {datum}',
     'Beste {partij_naam},

Hierbij nodig ik u uit voor een mediationgesprek:

Datum: {datum}
Tijd: {tijd}
Locatie: {locatie}
Verwachte duur: {duur}

Agenda:
{agenda}

Graag ontvang ik een bevestiging van uw aanwezigheid.

Met vriendelijke groet,
{mediator_naam}',
     1, 'afspraak', 7),

    -- Algemeen
    ('Voortgang dossier',
     'Update voortgang dossier',
     'Beste {partij_naam},

Hierbij een update over de voortgang van uw dossier.

{update_tekst}

Mocht u vragen hebben, dan kunt u via de portal reageren of contact met mij opnemen.

Met vriendelijke groet,
{mediator_naam}',
     1, 'algemeen', 8),

    ('Dossier afgerond',
     'Uw dossier is afgerond',
     'Beste {partij_naam},

Ik kan u mededelen dat uw dossier is afgerond.

{afronding_tekst}

Alle definitieve documenten zijn beschikbaar in de Document Portal. U kunt deze daar downloaden voor uw eigen administratie.

Ik wens u veel sterkte en succes voor de toekomst.

Met vriendelijke groet,
{mediator_naam}',
     1, 'algemeen', 9),

    -- Feestdagen
    ('Feestdagen bericht',
     'Fijne feestdagen',
     'Beste {partij_naam},

Namens ons kantoor wens ik u fijne feestdagen en een gezond en voorspoedig nieuwjaar.

Ons kantoor is gesloten van {start_datum} tot en met {eind_datum}. Vanaf {hervatting_datum} zijn wij weer bereikbaar.

Met vriendelijke groet,
{mediator_naam}',
     1, 'algemeen', 10);

    PRINT 'Seed data: 10 systeem templates inserted';
END
ELSE
    PRINT 'Systeem templates already exist, skipping seed data';
GO

-- =====================================================
-- VERIFY
-- =====================================================

SELECT 'bericht_templates' AS tabel, COUNT(*) AS aantal FROM bericht_templates
UNION ALL
SELECT 'dossier_berichten', COUNT(*) FROM dossier_berichten
UNION ALL
SELECT 'dossier_bericht_bijlagen', COUNT(*) FROM dossier_bericht_bijlagen
UNION ALL
SELECT 'dossier_bericht_gelezen', COUNT(*) FROM dossier_bericht_gelezen
UNION ALL
SELECT 'dossier_bericht_reacties', COUNT(*) FROM dossier_bericht_reacties
UNION ALL
SELECT 'bericht_email_log', COUNT(*) FROM bericht_email_log;

PRINT 'Migration completed successfully';
GO
