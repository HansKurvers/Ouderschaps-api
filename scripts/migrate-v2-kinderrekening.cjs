const sql = require('mssql');
require('dotenv').config();

async function migrateV2() {
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

        console.log('=== V2 KINDERREKENING MIGRATION ===\n');
        console.log('Adding 3 columns to alimentaties table:\n');
        console.log('  1. storting_ouder1_kinderrekening DECIMAL(10, 2)');
        console.log('  2. storting_ouder2_kinderrekening DECIMAL(10, 2)');
        console.log('  3. kinderrekening_kostensoorten NVARCHAR(MAX)\n');

        // Check if columns already exist
        const existingColumns = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
              AND COLUMN_NAME IN (
                'storting_ouder1_kinderrekening',
                'storting_ouder2_kinderrekening',
                'kinderrekening_kostensoorten'
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
        if (!existingColumnNames.includes('storting_ouder1_kinderrekening')) {
            columnsToAdd.push('storting_ouder1_kinderrekening DECIMAL(10, 2) NULL');
        }
        if (!existingColumnNames.includes('storting_ouder2_kinderrekening')) {
            columnsToAdd.push('storting_ouder2_kinderrekening DECIMAL(10, 2) NULL');
        }
        if (!existingColumnNames.includes('kinderrekening_kostensoorten')) {
            columnsToAdd.push('kinderrekening_kostensoorten NVARCHAR(MAX) NULL');
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
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
              AND COLUMN_NAME IN (
                'storting_ouder1_kinderrekening',
                'storting_ouder2_kinderrekening',
                'kinderrekening_kostensoorten'
              )
            ORDER BY COLUMN_NAME
        `);

        if (verify.recordset.length === 3) {
            console.log('✅ MIGRATION SUCCESSFUL - All 3 columns verified:\n');
            for (const col of verify.recordset) {
                console.log(`   ✅ ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
            }
        } else {
            console.log(`❌ MIGRATION INCOMPLETE - Found ${verify.recordset.length}/3 columns\n`);
        }

        // Show full table structure
        console.log('\n=== CURRENT TABLE STRUCTURE (alimentaties) ===\n');
        const structure = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
            ORDER BY ORDINAL_POSITION
        `);

        for (const col of structure.recordset) {
            const marker = ['storting_ouder1_kinderrekening', 'storting_ouder2_kinderrekening', 'kinderrekening_kostensoorten'].includes(col.COLUMN_NAME) ? '✨' : '  ';
            console.log(`${marker} ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
        }

        await pool.close();
        console.log('\n🎉 V2 Migration complete!\n');
        console.log('📝 Note: These fields are for kinderrekening functionality at alimentatie level.');
        console.log('    - storting_ouder1/2: Monthly deposit amounts per parent (all children combined)');
        console.log('    - kostensoorten: JSON array of allowed expense types (applies to all children)');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateV2();
