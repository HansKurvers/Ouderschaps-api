const sql = require('mssql');
require('dotenv').config();

async function migrateV6AfsprakenAlleKinderen() {
    try {
        const config = {
            server: process.env.DB_SERVER || '',
            database: process.env.DB_DATABASE || '',
            user: process.env.DB_USER || '',
            password: process.env.DB_PASSWORD || '',
            options: {
                encrypt: true,
                trustServerCertificate: false,
                enableArithAbort: true,
                connectionTimeout: 30000,
                requestTimeout: 30000,
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000,
            },
        };

        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('✅ Connected!\n');

        console.log('=== V6 AFSPRAKEN ALLE KINDEREN MIGRATION ===\n');
        console.log('Adding 5 afspraken settings columns to alimentaties table:\n');
        console.log('  1. afspraken_alle_kinderen_gelijk BIT');
        console.log('  2. hoofdverblijf_alle_kinderen VARCHAR(255)');
        console.log('  3. inschrijving_alle_kinderen VARCHAR(255)');
        console.log('  4. kinderbijslag_ontvanger_alle_kinderen VARCHAR(255)');
        console.log('  5. kindgebonden_budget_alle_kinderen VARCHAR(255)\n');

        // Check if columns already exist
        const existingColumns = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
              AND COLUMN_NAME IN (
                'afspraken_alle_kinderen_gelijk',
                'hoofdverblijf_alle_kinderen',
                'inschrijving_alle_kinderen',
                'kinderbijslag_ontvanger_alle_kinderen',
                'kindgebonden_budget_alle_kinderen'
              )
        `);

        if (existingColumns.recordset.length > 0) {
            console.log('⚠️  Some columns already exist:');
            for (const col of existingColumns.recordset) {
                console.log(`   - ${col.COLUMN_NAME}`);
            }
            console.log('\nSkipping columns that already exist...\n');
        }

        const existingColumnNames = existingColumns.recordset.map(c => c.COLUMN_NAME);

        // Add columns that don't exist
        const columnsToAdd = [];
        if (!existingColumnNames.includes('afspraken_alle_kinderen_gelijk')) {
            columnsToAdd.push('afspraken_alle_kinderen_gelijk BIT NULL');
        }
        if (!existingColumnNames.includes('hoofdverblijf_alle_kinderen')) {
            columnsToAdd.push('hoofdverblijf_alle_kinderen VARCHAR(255) NULL');
        }
        if (!existingColumnNames.includes('inschrijving_alle_kinderen')) {
            columnsToAdd.push('inschrijving_alle_kinderen VARCHAR(255) NULL');
        }
        if (!existingColumnNames.includes('kinderbijslag_ontvanger_alle_kinderen')) {
            columnsToAdd.push('kinderbijslag_ontvanger_alle_kinderen VARCHAR(255) NULL');
        }
        if (!existingColumnNames.includes('kindgebonden_budget_alle_kinderen')) {
            columnsToAdd.push('kindgebonden_budget_alle_kinderen VARCHAR(255) NULL');
        }

        if (columnsToAdd.length === 0) {
            console.log('✅ All columns already exist - no migration needed\n');
        } else {
            console.log(`Adding ${columnsToAdd.length} new columns...\n`);

            const alterQuery = `
                ALTER TABLE dbo.alimentaties
                ADD ${columnsToAdd.join(',\n    ')}
            `;

            console.log('Executing:');
            console.log(alterQuery);
            console.log('');

            await pool.request().query(alterQuery);

            console.log('✅ Columns added successfully!\n');
        }

        // Verify the migration
        console.log('=== VERIFYING MIGRATION ===\n');
        const verify = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
              AND COLUMN_NAME IN (
                'afspraken_alle_kinderen_gelijk',
                'hoofdverblijf_alle_kinderen',
                'inschrijving_alle_kinderen',
                'kinderbijslag_ontvanger_alle_kinderen',
                'kindgebonden_budget_alle_kinderen'
              )
            ORDER BY COLUMN_NAME
        `);

        if (verify.recordset.length === 5) {
            console.log('✅ MIGRATION SUCCESSFUL - All 5 columns verified:\n');
            for (const col of verify.recordset) {
                const length = col.CHARACTER_MAXIMUM_LENGTH ? ` (${col.CHARACTER_MAXIMUM_LENGTH})` : '';
                console.log(`   ✅ ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} (nullable: ${col.IS_NULLABLE})`);
            }
        } else {
            console.log(`❌ MIGRATION INCOMPLETE - Found ${verify.recordset.length}/5 columns\n`);
        }

        // Show alimentatie settings fields summary
        console.log('\n=== ALIMENTATIE SETTINGS FIELDS SUMMARY ===\n');
        const settingsFields = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
              AND (
                COLUMN_NAME LIKE '%alle_kinderen%'
                OR COLUMN_NAME = 'alimentatiegerechtigde'
              )
            ORDER BY COLUMN_NAME
        `);

        let bedragenCount = 0;
        let afsprakenCount = 0;

        console.log('V3 - Bedragen settings (3 fields):');
        for (const col of settingsFields.recordset) {
            if (['bedragen_alle_kinderen_gelijk', 'alimentatiebedrag_per_kind', 'zorgkorting_percentage_alle_kinderen', 'alimentatiegerechtigde'].includes(col.COLUMN_NAME)) {
                const length = col.CHARACTER_MAXIMUM_LENGTH ? ` (${col.CHARACTER_MAXIMUM_LENGTH})` : '';
                console.log(`   ⭐ ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length}`);
                bedragenCount++;
            }
        }

        console.log('\nV4 - Afspraken settings (5 fields - NEW):');
        for (const col of settingsFields.recordset) {
            if (['afspraken_alle_kinderen_gelijk', 'hoofdverblijf_alle_kinderen', 'inschrijving_alle_kinderen', 'kinderbijslag_ontvanger_alle_kinderen', 'kindgebonden_budget_alle_kinderen'].includes(col.COLUMN_NAME)) {
                const length = col.CHARACTER_MAXIMUM_LENGTH ? ` (${col.CHARACTER_MAXIMUM_LENGTH})` : '';
                console.log(`   🎯 ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length}`);
                afsprakenCount++;
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ⭐ Bedragen settings fields: ${bedragenCount}`);
        console.log(`   🎯 Afspraken settings fields: ${afsprakenCount}`);
        console.log(`   📋 Total settings fields: ${bedragenCount + afsprakenCount}`);

        await pool.close();
        console.log('\n🎉 V6 Afspraken Alle Kinderen Migration complete!\n');
        console.log('📝 Note: Alimentatie settings now include:');
        console.log('    ⭐ 4 Bedragen settings fields (V3)');
        console.log('       - bedragen_alle_kinderen_gelijk');
        console.log('       - alimentatiebedrag_per_kind');
        console.log('       - zorgkorting_percentage_alle_kinderen');
        console.log('       - alimentatiegerechtigde');
        console.log('    🎯 5 Afspraken settings fields (V4 - NEW)');
        console.log('       - afspraken_alle_kinderen_gelijk');
        console.log('       - hoofdverblijf_alle_kinderen');
        console.log('       - inschrijving_alle_kinderen');
        console.log('       - kinderbijslag_ontvanger_alle_kinderen');
        console.log('       - kindgebonden_budget_alle_kinderen');
        console.log('\n🔄 Frontend and Backend are now synchronized for "Afspraken voor alle kinderen gelijk"!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateV6AfsprakenAlleKinderen();
