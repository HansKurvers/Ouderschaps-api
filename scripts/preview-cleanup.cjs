const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function previewCleanup() {
    let pool;
    try {
        pool = await sql.connect(config);

        console.log('\n========================================');
        console.log('DATABASE CLEANUP PREVIEW');
        console.log('========================================\n');

        // Tabellen die geleegd worden
        const toDelete = [
            'gebruikers',
            'dossiers',
            'personen',
            'dossiers_partijen',
            'dossiers_kinderen',
            'kinderen_ouders',
            'omgang',
            'zorg',
            'alimentaties',
            'bijdragen_kosten_kinderen',
            'financiele_afspraken_kinderen',
            'ouderschapsplan_info'
        ];

        // Lookup tabellen die behouden blijven
        const toKeep = [
            'dagen',
            'dagdelen',
            'week_regelingen',
            'vakantie_regelingen',
            'rollen',
            'relatie_types',
            'zorg_categorieen',
            'zorg_situaties',
            'bijdrage_templates',
            'regelingen_templates'
        ];

        console.log('TE VERWIJDEREN:');
        console.log('----------------------------------------');
        let totalToDelete = 0;

        for (const table of toDelete) {
            try {
                const result = await pool.request().query(`SELECT COUNT(*) as count FROM dbo.${table}`);
                const count = result.recordset[0].count;
                totalToDelete += count;
                console.log(`  ${table.padEnd(35)} ${count} records`);
            } catch (err) {
                console.log(`  ${table.padEnd(35)} (tabel niet gevonden)`);
            }
        }

        // Check gedeelde_dossiers apart
        try {
            const result = await pool.request().query(`SELECT COUNT(*) as count FROM dbo.gedeelde_dossiers`);
            const count = result.recordset[0].count;
            totalToDelete += count;
            console.log(`  ${'gedeelde_dossiers'.padEnd(35)} ${count} records`);
        } catch (err) {
            // Tabel bestaat niet, skip
        }

        console.log('----------------------------------------');
        console.log(`  TOTAAL TE VERWIJDEREN:              ${totalToDelete} records`);

        console.log('\n\nBLIJFT BEHOUDEN (lookup data):');
        console.log('----------------------------------------');
        let totalToKeep = 0;

        for (const table of toKeep) {
            try {
                const result = await pool.request().query(`SELECT COUNT(*) as count FROM dbo.${table}`);
                const count = result.recordset[0].count;
                totalToKeep += count;
                console.log(`  ${table.padEnd(35)} ${count} records`);
            } catch (err) {
                console.log(`  ${table.padEnd(35)} (tabel niet gevonden)`);
            }
        }

        console.log('----------------------------------------');
        console.log(`  TOTAAL BEHOUDEN:                    ${totalToKeep} records`);

        console.log('\n========================================\n');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

previewCleanup();
