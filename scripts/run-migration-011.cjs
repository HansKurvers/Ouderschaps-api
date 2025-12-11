/**
 * Migration Script: Extend pensioen_uitvoerders with categorie and geschikt_voor
 * Run with: node scripts/run-migration-011.cjs
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
    const config = {
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            encrypt: true,
            trustServerCertificate: false,
            enableArithAbort: true
        }
    };

    console.log('🔌 Connecting to Azure SQL Database...');
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    console.log('');

    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected successfully!\n');

        // Read migration file
        const migrationPath = path.join(__dirname, '011_extend_financiele_instellingen.sql');
        console.log(`📄 Reading migration file: 011_extend_financiele_instellingen.sql`);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log(`   File size: ${migrationSQL.length} bytes\n`);

        // Split SQL by GO statements
        const batches = migrationSQL
            .split(/^\s*GO\s*$/im)
            .map(batch => batch.trim())
            .filter(batch => batch.length > 0);

        console.log(`🚀 Executing ${batches.length} SQL batch(es)...\n`);

        // Execute each batch
        for (let i = 0; i < batches.length; i++) {
            console.log(`   Batch ${i + 1}/${batches.length}...`);
            try {
                const result = await pool.request().query(batches[i]);

                // Show results if any
                if (result.recordsets && result.recordsets.length > 0) {
                    result.recordsets.forEach(recordset => {
                        if (recordset.length > 0) {
                            console.log('   📊 Results:');
                            console.table(recordset);
                        }
                    });
                }
            } catch (batchError) {
                console.error(`   ❌ Batch ${i + 1} failed:`, batchError.message);
                // Continue with next batch
            }
        }

        console.log('\n✅ Migration completed!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Database connection closed.');
        }
    }
}

runMigration();
