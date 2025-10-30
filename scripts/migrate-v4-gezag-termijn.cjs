const sql = require('mssql');
require('dotenv').config();

async function migrateV4GezagTermijn() {
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

        console.log('=== V4 GEZAG TERMIJN MIGRATION ===\n');
        console.log('Adding gezag_termijn_weken column to ouderschapsplan_info table:\n');
        console.log('  - gezag_termijn_weken INT NULL\n');
        console.log('Purpose: Store the number of weeks within which joint parental authority');
        console.log('         will be arranged when gezag_partij = 4 or 5\n');

        // Check if column already exists
        const existingColumns = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'ouderschapsplan_info'
              AND COLUMN_NAME = 'gezag_termijn_weken'
        `);

        if (existingColumns.recordset.length > 0) {
            console.log('⚠️  Column already exists - skipping migration\n');
        } else {
            console.log('Adding gezag_termijn_weken column...\n');

            const alterQuery = `
                ALTER TABLE dbo.ouderschapsplan_info
                ADD gezag_termijn_weken INT NULL
            `;

            console.log('Executing:');
            console.log(alterQuery);
            console.log('');

            await pool.request().query(alterQuery);

            console.log('✅ Column added successfully!\n');
        }

        // Verify the migration
        console.log('=== VERIFYING MIGRATION ===\n');
        const verify = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'ouderschapsplan_info'
              AND COLUMN_NAME = 'gezag_termijn_weken'
        `);

        if (verify.recordset.length === 1) {
            const col = verify.recordset[0];
            console.log('✅ MIGRATION SUCCESSFUL - Column verified:\n');
            console.log(`   ✅ ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})\n`);
        } else {
            console.log('❌ MIGRATION FAILED - Column not found\n');
        }

        // Show gezag-related fields
        console.log('=== GEZAG-RELATED FIELDS ===\n');
        const gezagFields = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
              AND TABLE_NAME = 'ouderschapsplan_info'
              AND (COLUMN_NAME = 'gezag_partij' OR COLUMN_NAME = 'gezag_termijn_weken')
            ORDER BY COLUMN_NAME
        `);

        for (const col of gezagFields.recordset) {
            console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
        }

        console.log('\n📊 Gezag field meanings:');
        console.log('   gezag_partij:');
        console.log('     1 = Wij hebben samen het ouderlijk gezag (standaard)');
        console.log('     2 = Partij 1 heeft alleen het gezag, blijft zo');
        console.log('     3 = Partij 2 heeft alleen het gezag, blijft zo');
        console.log('     4 = Partij 1 heeft alleen het gezag, we regelen samen gezag binnen X weken');
        console.log('     5 = Partij 2 heeft alleen het gezag, we regelen samen gezag binnen X weken');
        console.log('   gezag_termijn_weken:');
        console.log('     Only used when gezag_partij = 4 or 5');
        console.log('     Number of weeks within which joint parental authority will be arranged\n');

        await pool.close();
        console.log('🎉 V4 Gezag Termijn Migration complete!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.originalError) {
            console.error('Original Error:', error.originalError.message);
        }
        process.exit(1);
    }
}

migrateV4GezagTermijn();
