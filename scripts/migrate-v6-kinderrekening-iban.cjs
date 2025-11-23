const sql = require('mssql');
require('dotenv').config();

async function migrateV6() {
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

        console.log('=== V6 KINDERREKENING IBAN MIGRATION ===\n');
        console.log('Modifying ouderschapsplan_info.bankrekeningnummers_op_naam_van_kind:\n');
        console.log('  FROM: NVARCHAR(255) NULL');
        console.log('  TO:   NVARCHAR(MAX) NULL\n');
        console.log('Purpose: Support JSON array of multiple kinderrekeningen with IBAN data\n');

        // Check current column definition
        const currentColumn = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'ouderschapsplan_info'
              AND COLUMN_NAME = 'bankrekeningnummers_op_naam_van_kind'
        `);

        if (currentColumn.recordset.length === 0) {
            console.log('❌ ERROR: Column bankrekeningnummers_op_naam_van_kind does not exist!\n');
            console.log('   This migration requires the column to already exist.\n');
            process.exit(1);
        }

        const col = currentColumn.recordset[0];
        console.log('Current column definition:');
        console.log(`  Type: ${col.DATA_TYPE}`);
        console.log(`  Max Length: ${col.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : col.CHARACTER_MAXIMUM_LENGTH}`);
        console.log(`  Nullable: ${col.IS_NULLABLE}\n`);

        if (col.CHARACTER_MAXIMUM_LENGTH === -1) {
            console.log('✅ Column is already NVARCHAR(MAX) - no migration needed\n');
        } else {
            console.log('Altering column to NVARCHAR(MAX)...\n');

            const alterQuery = `
                ALTER TABLE dbo.ouderschapsplan_info
                ALTER COLUMN bankrekeningnummers_op_naam_van_kind NVARCHAR(MAX) NULL
            `;

            console.log('Executing:');
            console.log(alterQuery.trim());
            console.log('');

            await pool.request().query(alterQuery);

            console.log('✅ Column altered successfully!\n');
        }

        // Verify the migration
        console.log('=== VERIFYING MIGRATION ===\n');
        const verify = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'ouderschapsplan_info'
              AND COLUMN_NAME = 'bankrekeningnummers_op_naam_van_kind'
        `);

        const verifiedCol = verify.recordset[0];
        if (verifiedCol.CHARACTER_MAXIMUM_LENGTH === -1) {
            console.log('✅ MIGRATION SUCCESSFUL - Column verified:\n');
            console.log(`   ✅ ${verifiedCol.COLUMN_NAME}: ${verifiedCol.DATA_TYPE}(MAX) (nullable: ${verifiedCol.IS_NULLABLE})`);
        } else {
            console.log(`❌ MIGRATION FAILED - Column is still ${verifiedCol.DATA_TYPE}(${verifiedCol.CHARACTER_MAXIMUM_LENGTH})\n`);
        }

        // Check if there's existing data that needs migration
        console.log('\n=== CHECKING EXISTING DATA ===\n');
        const existingData = await pool.request().query(`
            SELECT
                COUNT(*) as total_records,
                COUNT(bankrekeningnummers_op_naam_van_kind) as records_with_data,
                MAX(LEN(bankrekeningnummers_op_naam_van_kind)) as max_length
            FROM dbo.ouderschapsplan_info
        `);

        const stats = existingData.recordset[0];
        console.log(`Total ouderschapsplan_info records: ${stats.total_records}`);
        console.log(`Records with bankrekeningnummers data: ${stats.records_with_data}`);
        console.log(`Longest existing value: ${stats.max_length || 0} characters\n`);

        if (stats.records_with_data > 0) {
            console.log('⚠️  EXISTING DATA FOUND!\n');
            console.log('   Action required: Existing data needs to be migrated to new JSON array format.');
            console.log('   Current format: Free text string');
            console.log('   New format: JSON array of {iban, tenaamstelling, bankNaam}\n');
            console.log('   Example conversion:');
            console.log('   OLD: "NL91ABNA0417164300"');
            console.log('   NEW: [{"iban":"NL91ABNA0417164300","tenaamstelling":"","bankNaam":""}]\n');
            console.log('   This data migration should be done manually or with a separate script\n');
            console.log('   to preserve existing IBAN data and add missing fields.\n');
        } else {
            console.log('✅ No existing data - clean migration!\n');
        }

        await pool.close();
        console.log('🎉 V6 Migration complete!\n');
        console.log('📝 Note: This field now supports JSON array of kinderrekening objects:');
        console.log('    [');
        console.log('      {');
        console.log('        "iban": "NL91ABNA0417164300",');
        console.log('        "tenaamstelling": "Emma de Vries",');
        console.log('        "bankNaam": "ABN AMRO"');
        console.log('      }');
        console.log('    ]');
        console.log('\n💡 Frontend should validate IBAN format before sending to backend.');
        console.log('   Backend will validate JSON structure and required fields only.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateV6();
