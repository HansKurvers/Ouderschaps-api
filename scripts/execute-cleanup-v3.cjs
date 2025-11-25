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

async function executeCleanup() {
    let pool;
    try {
        pool = await sql.connect(config);

        console.log('\n========================================');
        console.log('DATABASE CLEANUP - UITVOEREN (v3)');
        console.log('========================================\n');

        // Correcte volgorde gebaseerd op foreign key dependencies
        // We moeten eerst de alimentatie FK naar bijdrage_kosten_kinderen NULLen

        console.log('Stap 1: Circulaire referenties verbreken...');

        // Zet de bijdrage_kosten_kinderen FK in alimentaties naar NULL
        await pool.request().query(`
            UPDATE dbo.alimentaties SET bijdrage_kosten_kinderen = NULL
        `);
        console.log('✓ alimentaties.bijdrage_kosten_kinderen = NULL gezet\n');

        // Nu kunnen we in de juiste volgorde deleten
        console.log('Stap 2: Data verwijderen...');

        const deleteOrder = [
            // Eerst de diepste afhankelijkheden
            'financiele_afspraken_kinderen',  // FK -> alimentaties, personen
            'bijdragen_kosten_kinderen',       // FK -> alimentaties, personen
            'alimentaties',                    // FK -> dossiers
            'zorg',                            // FK -> dossiers, gebruikers
            'omgang',                          // FK -> dossiers, personen
            'ouderschapsplan_info',            // FK -> dossiers, personen
            'kinderen_ouders',                 // FK -> personen
            'dossiers_kinderen',               // FK -> dossiers, personen
            'dossiers_partijen',               // FK -> dossiers, personen
            'gedeelde_dossiers',               // FK -> dossiers, gebruikers
            'dossiers',                        // FK -> gebruikers
            'personen',                        // FK -> gebruikers
            'gebruikers'                       // Basis tabel
        ];

        let totalDeleted = 0;

        for (const table of deleteOrder) {
            try {
                const result = await pool.request().query(`DELETE FROM dbo.${table}`);
                const count = result.rowsAffected[0];
                totalDeleted += count;
                console.log(`✓ ${table.padEnd(35)} ${count} records verwijderd`);

                // Reset identity
                try {
                    await pool.request().query(`DBCC CHECKIDENT ('dbo.${table}', RESEED, 0)`);
                } catch (e) {
                    // Sommige tabellen hebben geen identity column
                }
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log(`- ${table.padEnd(35)} (niet gevonden)`);
                } else {
                    console.log(`✗ ${table.padEnd(35)} FOUT: ${err.message}`);
                }
            }
        }

        console.log('\n----------------------------------------');
        console.log(`TOTAAL VERWIJDERD: ${totalDeleted} records`);
        console.log('----------------------------------------');

        // Verificatie
        console.log('\nVERIFICATIE - Data tabellen (moeten 0 zijn):');
        console.log('----------------------------------------');

        const verifyTables = ['gebruikers', 'dossiers', 'personen', 'omgang', 'zorg', 'alimentaties'];
        let allClean = true;
        for (const table of verifyTables) {
            const result = await pool.request().query(`SELECT COUNT(*) as count FROM dbo.${table}`);
            const count = result.recordset[0].count;
            const status = count === 0 ? '✓' : '✗';
            if (count !== 0) allClean = false;
            console.log(`  ${status} ${table.padEnd(20)} ${count} records`);
        }

        console.log('\nLookup tabellen (behouden):');
        console.log('----------------------------------------');
        const lookupTables = ['dagen', 'dagdelen', 'rollen', 'zorg_categorieen', 'zorg_situaties'];
        for (const table of lookupTables) {
            const result = await pool.request().query(`SELECT COUNT(*) as count FROM dbo.${table}`);
            console.log(`  ✓ ${table.padEnd(20)} ${result.recordset[0].count} records`);
        }

        console.log('\n========================================');
        if (allClean) {
            console.log('DATABASE CLEANUP SUCCESVOL VOLTOOID!');
        } else {
            console.log('DATABASE CLEANUP DEELS VOLTOOID');
            console.log('Sommige tabellen bevatten nog data.');
        }
        console.log('========================================\n');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

executeCleanup();
