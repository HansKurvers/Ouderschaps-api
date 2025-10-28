const sql = require('mssql');
require('dotenv').config();

async function rollbackV1() {
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

        console.log('=== ROLLBACK V1 KINDERREKENING IMPLEMENTATION ===\n');

        // Check if the incorrect column exists
        console.log('Checking for incorrect column in financiele_afspraken_kinderen...');
        const checkColumn = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'financiele_afspraken_kinderen'
              AND COLUMN_NAME = 'kinderrekening_kostensoorten'
        `);

        if (checkColumn.recordset.length === 0) {
            console.log('✅ Column does not exist - nothing to rollback\n');
            await pool.close();
            return;
        }

        console.log('⚠️  Found incorrect column "kinderrekening_kostensoorten" in financiele_afspraken_kinderen');
        console.log('This column was added by V1 spec and needs to be removed.\n');

        // Drop the column
        console.log('Dropping column...');
        await pool.request().query(`
            ALTER TABLE dbo.financiele_afspraken_kinderen
            DROP COLUMN kinderrekening_kostensoorten
        `);

        console.log('✅ Column dropped successfully!\n');

        // Verify removal
        console.log('=== VERIFYING ROLLBACK ===\n');
        const verify = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'financiele_afspraken_kinderen'
              AND COLUMN_NAME = 'kinderrekening_kostensoorten'
        `);

        if (verify.recordset.length === 0) {
            console.log('✅ ROLLBACK SUCCESSFUL - Column no longer exists\n');
        } else {
            console.log('❌ ROLLBACK FAILED - Column still exists!\n');
        }

        // Show current structure
        console.log('=== CURRENT TABLE STRUCTURE (financiele_afspraken_kinderen) ===\n');
        const structure = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'financiele_afspraken_kinderen'
            ORDER BY ORDINAL_POSITION
        `);

        for (const col of structure.recordset) {
            console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
        }

        await pool.close();
        console.log('\n🎉 V1 Rollback complete! Ready for V2 implementation.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

rollbackV1();
