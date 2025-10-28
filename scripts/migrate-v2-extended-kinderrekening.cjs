const sql = require('mssql');
require('dotenv').config();

async function migrateV2Extended() {
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

        console.log('=== V2 EXTENDED KINDERREKENING MIGRATION ===\n');
        console.log('Adding 4 new columns to alimentaties table:\n');
        console.log('  1. kinderrekening_maximum_opname BIT');
        console.log('  2. kinderrekening_maximum_opname_bedrag DECIMAL(10, 2)');
        console.log('  3. kinderbijslag_storten_op_kinderrekening BIT');
        console.log('  4. kindgebonden_budget_storten_op_kinderrekening BIT\n');

        // Check if columns already exist
        const existingColumns = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
              AND COLUMN_NAME IN (
                'kinderrekening_maximum_opname',
                'kinderrekening_maximum_opname_bedrag',
                'kinderbijslag_storten_op_kinderrekening',
                'kindgebonden_budget_storten_op_kinderrekening'
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
        if (!existingColumnNames.includes('kinderrekening_maximum_opname')) {
            columnsToAdd.push('kinderrekening_maximum_opname BIT NULL');
        }
        if (!existingColumnNames.includes('kinderrekening_maximum_opname_bedrag')) {
            columnsToAdd.push('kinderrekening_maximum_opname_bedrag DECIMAL(10, 2) NULL');
        }
        if (!existingColumnNames.includes('kinderbijslag_storten_op_kinderrekening')) {
            columnsToAdd.push('kinderbijslag_storten_op_kinderrekening BIT NULL');
        }
        if (!existingColumnNames.includes('kindgebonden_budget_storten_op_kinderrekening')) {
            columnsToAdd.push('kindgebonden_budget_storten_op_kinderrekening BIT NULL');
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
                'kinderrekening_maximum_opname',
                'kinderrekening_maximum_opname_bedrag',
                'kinderbijslag_storten_op_kinderrekening',
                'kindgebonden_budget_storten_op_kinderrekening'
              )
            ORDER BY COLUMN_NAME
        `);

        if (verify.recordset.length === 4) {
            console.log('✅ MIGRATION SUCCESSFUL - All 4 columns verified:\n');
            for (const col of verify.recordset) {
                console.log(`   ✅ ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
            }
        } else {
            console.log(`❌ MIGRATION INCOMPLETE - Found ${verify.recordset.length}/4 columns\n`);
        }

        // Show full table structure for all kinderrekening fields
        console.log('\n=== ALL KINDERREKENING FIELDS (alimentaties) ===\n');
        const structure = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'alimentaties'
              AND (
                COLUMN_NAME LIKE '%kinderrekening%' OR
                COLUMN_NAME LIKE '%kinderbijslag%' OR
                COLUMN_NAME LIKE '%kindgebonden%'
              )
            ORDER BY ORDINAL_POSITION
        `);

        for (const col of structure.recordset) {
            const marker = [
                'kinderrekening_maximum_opname',
                'kinderrekening_maximum_opname_bedrag',
                'kinderbijslag_storten_op_kinderrekening',
                'kindgebonden_budget_storten_op_kinderrekening'
            ].includes(col.COLUMN_NAME) ? '✨' : '  ';
            console.log(`${marker} ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
        }

        await pool.close();
        console.log('\n🎉 V2 Extended Migration complete!\n');
        console.log('📝 Note: Total 7 kinderrekening fields now in alimentaties table:');
        console.log('    - storting_ouder1_kinderrekening (V2 initial)');
        console.log('    - storting_ouder2_kinderrekening (V2 initial)');
        console.log('    - kinderrekening_kostensoorten (V2 initial)');
        console.log('    - kinderrekening_maximum_opname (V2 extended - NEW)');
        console.log('    - kinderrekening_maximum_opname_bedrag (V2 extended - NEW)');
        console.log('    - kinderbijslag_storten_op_kinderrekening (V2 extended - NEW)');
        console.log('    - kindgebonden_budget_storten_op_kinderrekening (V2 extended - NEW)');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateV2Extended();
