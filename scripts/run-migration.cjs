/**
 * Database Migration Runner
 * Runs the sort_order migration on Azure SQL Database
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Database configuration from environment or direct values
const config = {
    server: 'sql-ouderschapsplan-server.database.windows.net',
    database: 'db-ouderschapsplan',
    user: 'sqladmin',
    password: 'jrWDaVQe9S7s2cv',
    options: {
        encrypt: true, // Azure requires encryption
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 60000
    }
};

async function runMigration() {
    console.log('🚀 Starting database migration...\n');

    let pool;

    try {
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '001_add_sort_order_to_regelingen_templates.sql');
        console.log(`📄 Reading migration file: ${migrationPath}`);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log(`✅ Migration file loaded (${migrationSQL.length} characters)\n`);

        // Connect to database
        console.log(`🔌 Connecting to database...`);
        console.log(`   Server: ${config.server}`);
        console.log(`   Database: ${config.database}`);
        console.log(`   User: ${config.user}\n`);

        pool = await sql.connect(config);
        console.log('✅ Connected to database successfully!\n');

        // Split SQL into batches (separated by GO)
        const batches = migrationSQL
            .split(/\nGO\n/i)
            .map(batch => batch.trim())
            .filter(batch => batch.length > 0);

        console.log(`📦 Found ${batches.length} SQL batches to execute\n`);

        // Execute each batch
        for (let i = 0; i < batches.length; i++) {
            console.log(`⚙️  Executing batch ${i + 1}/${batches.length}...`);

            try {
                const result = await pool.request().query(batches[i]);

                // Print any messages/output
                if (result.recordset && result.recordset.length > 0) {
                    console.log('   Result:', result.recordset);
                }

                console.log(`   ✅ Batch ${i + 1} completed successfully`);
            } catch (batchError) {
                console.error(`   ❌ Error in batch ${i + 1}:`, batchError.message);
                throw batchError;
            }
        }

        console.log('\n🎉 Migration completed successfully!\n');

        // Verify migration
        console.log('🔍 Verifying migration...\n');

        const verifyQuery = `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = 'regelingen_templates'
            AND COLUMN_NAME = 'sort_order'
        `;

        const verifyResult = await pool.request().query(verifyQuery);

        if (verifyResult.recordset.length > 0) {
            console.log('✅ Verification passed: sort_order column exists');
            console.log('   Details:', verifyResult.recordset[0]);
        } else {
            console.log('⚠️  Warning: sort_order column not found in verification');
        }

        // Show sample data
        console.log('\n📊 Sample data with sort_order:\n');

        const sampleQuery = `
            SELECT TOP 5
                id,
                template_naam,
                type,
                meervoud_kinderen,
                sort_order
            FROM dbo.regelingen_templates
            ORDER BY type, meervoud_kinderen, sort_order
        `;

        const sampleResult = await pool.request().query(sampleQuery);
        console.table(sampleResult.recordset);

        console.log('\n✨ Migration complete! You can now customize template order.');
        console.log('   Example: UPDATE dbo.regelingen_templates SET sort_order = 5 WHERE id = 1;\n');

    } catch (error) {
        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Database connection closed.');
        }
    }
}

// Run migration
console.log('═══════════════════════════════════════════════════════');
console.log('  Database Migration: Add sort_order to templates');
console.log('═══════════════════════════════════════════════════════\n');

runMigration()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
