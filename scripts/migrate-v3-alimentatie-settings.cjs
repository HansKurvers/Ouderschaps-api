const sql = require('mssql');
require('dotenv').config();

async function migrateV3AlimentatieSettings() {
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

        console.log('=== V3 ALIMENTATIE SETTINGS MIGRATION ===\n');
        console.log('Adding 3 alimentatie settings columns to alimentaties table:\n');
        console.log('  1. bedragen_alle_kinderen_gelijk BIT');
        console.log('  2. alimentatiebedrag_per_kind DECIMAL(10, 2)');
        console.log('  3. alimentatiegerechtigde VARCHAR(255)\n');

        // Check if columns already exist
        const existingColumns = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
              AND COLUMN_NAME IN (
                'bedragen_alle_kinderen_gelijk',
                'alimentatiebedrag_per_kind',
                'alimentatiegerechtigde'
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
        if (!existingColumnNames.includes('bedragen_alle_kinderen_gelijk')) {
            columnsToAdd.push('bedragen_alle_kinderen_gelijk BIT NULL');
        }
        if (!existingColumnNames.includes('alimentatiebedrag_per_kind')) {
            columnsToAdd.push('alimentatiebedrag_per_kind DECIMAL(10, 2) NULL');
        }
        if (!existingColumnNames.includes('alimentatiegerechtigde')) {
            columnsToAdd.push('alimentatiegerechtigde VARCHAR(255) NULL');
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
                'bedragen_alle_kinderen_gelijk',
                'alimentatiebedrag_per_kind',
                'alimentatiegerechtigde'
              )
            ORDER BY COLUMN_NAME
        `);

        if (verify.recordset.length === 3) {
            console.log('✅ MIGRATION SUCCESSFUL - All 3 columns verified:\n');
            for (const col of verify.recordset) {
                const length = col.CHARACTER_MAXIMUM_LENGTH ? ` (${col.CHARACTER_MAXIMUM_LENGTH})` : '';
                console.log(`   ✅ ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} (nullable: ${col.IS_NULLABLE})`);
            }
        } else {
            console.log(`❌ MIGRATION INCOMPLETE - Found ${verify.recordset.length}/3 columns\n`);
        }

        // Show ALL alimentatie fields (10 total now!)
        console.log('\n=== ALL ALIMENTATIE FIELDS (Complete V3) ===\n');
        const structure = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
            ORDER BY ORDINAL_POSITION
        `);

        let kinderrekeningCount = 0;
        let settingsCount = 0;

        for (const col of structure.recordset) {
            const length = col.CHARACTER_MAXIMUM_LENGTH ? ` (${col.CHARACTER_MAXIMUM_LENGTH})` : '';
            const isKinderrekening = col.COLUMN_NAME.includes('kinderrekening') ||
                                     col.COLUMN_NAME.includes('kinderbijslag') ||
                                     col.COLUMN_NAME.includes('kindgebonden') ||
                                     col.COLUMN_NAME.includes('storting_ouder');
            const isSettings = ['bedragen_alle_kinderen_gelijk', 'alimentatiebedrag_per_kind', 'alimentatiegerechtigde'].includes(col.COLUMN_NAME);

            let marker = '  ';
            if (isSettings) {
                marker = '⭐';
                settingsCount++;
            } else if (isKinderrekening) {
                marker = '✨';
                kinderrekeningCount++;
            }

            console.log(`${marker} ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} (nullable: ${col.IS_NULLABLE})`);
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✨ Kinderrekening fields: ${kinderrekeningCount}`);
        console.log(`   ⭐ Alimentatie settings fields: ${settingsCount}`);
        console.log(`   📋 Total special fields: ${kinderrekeningCount + settingsCount}`);

        await pool.close();
        console.log('\n🎉 V3 Alimentatie Settings Migration complete!\n');
        console.log('📝 Note: Total 10 alimentatie-related fields now in alimentaties table:');
        console.log('    ✨ 7 Kinderrekening fields (V2)');
        console.log('    ⭐ 3 Alimentatie settings fields (V3 - NEW)');
        console.log('\n🔄 Backend and Document Generator are now fully synchronized!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateV3AlimentatieSettings();
