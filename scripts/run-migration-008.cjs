const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
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
                requestTimeout: 60000, // Longer timeout for migration
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000,
            },
        };

        console.log('🚀 Starting Migration: Move omgang_tekst_of_schema to omgangsregeling\n');
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('✅ Connected!\n');

        // Read the SQL migration file
        const sqlFilePath = path.join(__dirname, '008_move_omgang_tekst_to_omgangsregeling.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split by GO statements
        const batches = sqlContent
            .split(/\r?\nGO\r?\n/i)
            .map(batch => batch.trim())
            .filter(batch => batch.length > 0);

        console.log(`📝 Found ${batches.length} SQL batches to execute\n`);
        console.log('='.repeat(60));

        // Execute each batch
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`\n[${i + 1}/${batches.length}] Executing batch...`);

            try {
                const result = await pool.request().query(batch);

                // Log any messages from the server (PRINT statements)
                if (result.recordset && result.recordset.length > 0) {
                    result.recordset.forEach(row => {
                        Object.values(row).forEach(val => console.log(`  ℹ️  ${val}`));
                    });
                }

                console.log(`  ✅ Batch ${i + 1} completed successfully`);
            } catch (error) {
                console.error(`  ❌ Error in batch ${i + 1}:`, error.message);
                throw error;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log('  • Created omgangsregeling table');
        console.log('  • Migrated existing data');
        console.log('  • Dropped old column from communicatie_afspraken');

        await pool.close();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
