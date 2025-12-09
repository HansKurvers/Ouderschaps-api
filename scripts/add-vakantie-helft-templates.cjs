#!/usr/bin/env node

const sql = require('mssql');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database configuration
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    }
};

// Template definitions - 12 templates (6 concepts x 2 meervoud variants)
const templates = [
    // Groep 1: Oneven jaren - PARTIJ1 eerste helft (sort_order 1)
    {
        naam: 'vakantie_oneven_p1_eerste_helft',
        tekst: 'In de oneven jaren verblijft {KIND} de eerste helft van de {VAKANTIE} bij {PARTIJ1} en de tweede helft bij {PARTIJ2}.',
        cardTekst: 'Oneven jaren: 1e helft {PARTIJ1}, 2e helft {PARTIJ2}',
        meervoud: 0,
        sortOrder: 1
    },
    {
        naam: 'vakantie_oneven_p1_eerste_helft_meervoud',
        tekst: 'In de oneven jaren verblijven {KINDEREN} de eerste helft van de {VAKANTIE} bij {PARTIJ1} en de tweede helft bij {PARTIJ2}.',
        cardTekst: 'Oneven jaren: 1e helft {PARTIJ1}, 2e helft {PARTIJ2}',
        meervoud: 1,
        sortOrder: 1
    },

    // Groep 2: Even jaren - PARTIJ1 eerste helft (sort_order 2)
    {
        naam: 'vakantie_even_p1_eerste_helft',
        tekst: 'In de even jaren verblijft {KIND} de eerste helft van de {VAKANTIE} bij {PARTIJ1} en de tweede helft bij {PARTIJ2}.',
        cardTekst: 'Even jaren: 1e helft {PARTIJ1}, 2e helft {PARTIJ2}',
        meervoud: 0,
        sortOrder: 2
    },
    {
        naam: 'vakantie_even_p1_eerste_helft_meervoud',
        tekst: 'In de even jaren verblijven {KINDEREN} de eerste helft van de {VAKANTIE} bij {PARTIJ1} en de tweede helft bij {PARTIJ2}.',
        cardTekst: 'Even jaren: 1e helft {PARTIJ1}, 2e helft {PARTIJ2}',
        meervoud: 1,
        sortOrder: 2
    },

    // Groep 3: Oneven jaren - PARTIJ2 eerste helft (sort_order 3)
    {
        naam: 'vakantie_oneven_p2_eerste_helft',
        tekst: 'In de oneven jaren verblijft {KIND} de eerste helft van de {VAKANTIE} bij {PARTIJ2} en de tweede helft bij {PARTIJ1}.',
        cardTekst: 'Oneven jaren: 1e helft {PARTIJ2}, 2e helft {PARTIJ1}',
        meervoud: 0,
        sortOrder: 3
    },
    {
        naam: 'vakantie_oneven_p2_eerste_helft_meervoud',
        tekst: 'In de oneven jaren verblijven {KINDEREN} de eerste helft van de {VAKANTIE} bij {PARTIJ2} en de tweede helft bij {PARTIJ1}.',
        cardTekst: 'Oneven jaren: 1e helft {PARTIJ2}, 2e helft {PARTIJ1}',
        meervoud: 1,
        sortOrder: 3
    },

    // Groep 4: Even jaren - PARTIJ2 eerste helft (sort_order 4)
    {
        naam: 'vakantie_even_p2_eerste_helft',
        tekst: 'In de even jaren verblijft {KIND} de eerste helft van de {VAKANTIE} bij {PARTIJ2} en de tweede helft bij {PARTIJ1}.',
        cardTekst: 'Even jaren: 1e helft {PARTIJ2}, 2e helft {PARTIJ1}',
        meervoud: 0,
        sortOrder: 4
    },
    {
        naam: 'vakantie_even_p2_eerste_helft_meervoud',
        tekst: 'In de even jaren verblijven {KINDEREN} de eerste helft van de {VAKANTIE} bij {PARTIJ2} en de tweede helft bij {PARTIJ1}.',
        cardTekst: 'Even jaren: 1e helft {PARTIJ2}, 2e helft {PARTIJ1}',
        meervoud: 1,
        sortOrder: 4
    },

    // Groep 5: Eerste keuze - Even PARTIJ1, Oneven PARTIJ2 (sort_order 5)
    {
        naam: 'vakantie_keuze_even_p1_oneven_p2',
        tekst: 'In de even jaren heeft {PARTIJ1} de eerste keuze of {KIND} voor de eerste of tweede helft van de {VAKANTIE} bij {PARTIJ1} verblijft en in de oneven jaren heeft {PARTIJ2} de eerste keuze of {KIND} voor de eerste of tweede helft van de {VAKANTIE} bij {PARTIJ2} verblijft.',
        cardTekst: 'Even: {PARTIJ1} kiest eerst, Oneven: {PARTIJ2} kiest eerst',
        meervoud: 0,
        sortOrder: 5
    },
    {
        naam: 'vakantie_keuze_even_p1_oneven_p2_meervoud',
        tekst: 'In de even jaren heeft {PARTIJ1} de eerste keuze of {KINDEREN} voor de eerste of tweede helft van de {VAKANTIE} bij {PARTIJ1} verblijven en in de oneven jaren heeft {PARTIJ2} de eerste keuze of {KINDEREN} voor de eerste of tweede helft van de {VAKANTIE} bij {PARTIJ2} verblijven.',
        cardTekst: 'Even: {PARTIJ1} kiest eerst, Oneven: {PARTIJ2} kiest eerst',
        meervoud: 1,
        sortOrder: 5
    },

    // Groep 6: Eerste keuze - Oneven PARTIJ1, Even PARTIJ2 (sort_order 6)
    {
        naam: 'vakantie_keuze_oneven_p1_even_p2',
        tekst: 'In de oneven jaren heeft {PARTIJ1} de eerste keuze of {KIND} voor de eerste of tweede helft van de {VAKANTIE} bij {PARTIJ1} verblijft en in de even jaren heeft {PARTIJ2} de eerste keuze of {KIND} voor de eerste of tweede helft van de {VAKANTIE} bij {PARTIJ2} verblijft.',
        cardTekst: 'Oneven: {PARTIJ1} kiest eerst, Even: {PARTIJ2} kiest eerst',
        meervoud: 0,
        sortOrder: 6
    },
    {
        naam: 'vakantie_keuze_oneven_p1_even_p2_meervoud',
        tekst: 'In de oneven jaren heeft {PARTIJ1} de eerste keuze of {KINDEREN} voor de eerste of tweede helft van de {VAKANTIE} bij {PARTIJ1} verblijven en in de even jaren heeft {PARTIJ2} de eerste keuze of {KINDEREN} voor de eerste of tweede helft van de {VAKANTIE} bij {PARTIJ2} verblijven.',
        cardTekst: 'Oneven: {PARTIJ1} kiest eerst, Even: {PARTIJ2} kiest eerst',
        meervoud: 1,
        sortOrder: 6
    }
];

async function addVakantieHelftTemplates() {
    let pool;

    try {
        console.log('Connecting to database...');
        pool = await sql.connect(config);
        console.log('Database connected');

        // First, add card_tekst column if it doesn't exist
        console.log('\nChecking if card_tekst column exists...');
        const columnCheck = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'regelingen_templates' AND COLUMN_NAME = 'card_tekst'
        `);

        if (columnCheck.recordset.length === 0) {
            console.log('Adding card_tekst column...');
            await pool.request().query(`
                ALTER TABLE dbo.regelingen_templates
                ADD card_tekst NVARCHAR(MAX) NULL
            `);
            console.log('card_tekst column added successfully');
        } else {
            console.log('card_tekst column already exists');
        }

        // First check current vakantie templates
        console.log('\nCurrent Vakantie templates:');
        const currentTemplates = await pool.request().query(`
            SELECT id, template_naam, sort_order, meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE type = 'Vakantie'
            ORDER BY sort_order, template_naam
        `);
        console.table(currentTemplates.recordset);

        // Insert new templates
        console.log('\nAdding 12 new Vakantie templates...');

        let addedCount = 0;
        for (const template of templates) {
            // Check if template already exists
            const existing = await pool.request()
                .input('naam', sql.NVarChar, template.naam)
                .query(`
                    SELECT id FROM dbo.regelingen_templates
                    WHERE template_naam = @naam
                `);

            if (existing.recordset.length > 0) {
                console.log(`  Skipping ${template.naam} (already exists)`);
                continue;
            }

            await pool.request()
                .input('template_naam', sql.NVarChar, template.naam)
                .input('template_tekst', sql.NVarChar, template.tekst)
                .input('card_tekst', sql.NVarChar, template.cardTekst)
                .input('meervoud_kinderen', sql.Bit, template.meervoud)
                .input('type', sql.NVarChar, 'Vakantie')
                .input('sort_order', sql.Int, template.sortOrder)
                .query(`
                    INSERT INTO dbo.regelingen_templates
                    (template_naam, template_tekst, card_tekst, meervoud_kinderen, type, sort_order)
                    VALUES
                    (@template_naam, @template_tekst, @card_tekst, @meervoud_kinderen, @type, @sort_order)
                `);

            addedCount++;
            console.log(`  Added: ${template.naam}`);
        }

        // Show final state
        console.log(`\nAdded ${addedCount} new templates`);
        console.log('\nAll Vakantie templates after migration:');
        const finalTemplates = await pool.request().query(`
            SELECT id, template_naam, sort_order, meervoud_kinderen,
                   LEFT(template_tekst, 50) as tekst_preview,
                   card_tekst
            FROM dbo.regelingen_templates
            WHERE type = 'Vakantie'
            ORDER BY sort_order, meervoud_kinderen, template_naam
        `);
        console.table(finalTemplates.recordset);

        console.log('\nMigration complete!');
        console.log('New templates will appear at the top of the vakantie options.');

    } catch (error) {
        console.error('\nError:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\nDatabase connection closed');
        }
    }
}

// Run the script
addVakantieHelftTemplates().catch(console.error);
