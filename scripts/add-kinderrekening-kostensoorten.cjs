const sql = require('mssql');
require('dotenv').config();

async function addKinderrekeningKostensoortenColumn() {
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

        // Check if column already exists
        console.log('=== CHECKING IF COLUMN EXISTS ===\n');
        const checkColumn = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'financiele_afspraken_kinderen'
              AND COLUMN_NAME = 'kinderrekening_kostensoorten'
        `);

        if (checkColumn.recordset.length > 0) {
            console.log('⚠️  Column "kinderrekening_kostensoorten" already exists!');
            console.log('No migration needed.\n');
            await pool.close();
            return;
        }

        console.log('Column does not exist. Proceeding with migration...\n');

        // Add the new column
        console.log('=== ADDING COLUMN ===\n');
        console.log('Executing:');
        console.log('ALTER TABLE dbo.financiele_afspraken_kinderen');
        console.log('ADD kinderrekening_kostensoorten NVARCHAR(MAX) NULL;\n');

        await pool.request().query(`
            ALTER TABLE dbo.financiele_afspraken_kinderen
            ADD kinderrekening_kostensoorten NVARCHAR(MAX) NULL
        `);

        console.log('✅ Column added successfully!\n');

        // Verify the addition
        console.log('=== VERIFYING COLUMN ===\n');
        const verify = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'financiele_afspraken_kinderen'
              AND COLUMN_NAME = 'kinderrekening_kostensoorten'
        `);

        if (verify.recordset.length > 0) {
            const col = verify.recordset[0];
            console.log('✅ VERIFICATION SUCCESSFUL:');
            console.log(`   Column: ${col.COLUMN_NAME}`);
            console.log(`   Type: ${col.DATA_TYPE}`);
            console.log(`   Nullable: ${col.IS_NULLABLE}`);
        } else {
            console.log('❌ VERIFICATION FAILED - Column not found after addition!');
        }

        // Show current table structure
        console.log('\n=== CURRENT TABLE STRUCTURE ===\n');
        const structure = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'financiele_afspraken_kinderen'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('Columns in financiele_afspraken_kinderen:');
        for (const col of structure.recordset) {
            console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
        }

        await pool.close();
        console.log('\n🎉 Migration complete!\n');
        console.log('📝 Note: This column stores JSON arrays of strings representing kostensoorten.');
        console.log('    Example value: ["Schoolgeld, schoolbenodigdheden", "Sport (contributie)"]');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

addKinderrekeningKostensoortenColumn();
