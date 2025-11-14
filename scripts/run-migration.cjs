/**
 * Migration Runner Script
 * Executes SQL migration files on Azure SQL Database
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration(migrationFile) {
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
    console.log(`   User: ${config.user}`);
    console.log('');

    let pool;
    try {
        // Connect to database
        pool = await sql.connect(config);
        console.log('✅ Connected successfully!\n');

        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
        console.log(`📄 Reading migration file: ${migrationFile}`);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log(`   File size: ${migrationSQL.length} bytes\n`);

        // Split SQL by GO statements (SQL Server batch separator)
        const batches = migrationSQL
            .split(/^\s*GO\s*$/im)
            .map(batch => batch.trim())
            .filter(batch => batch.length > 0);

        console.log(`🚀 Executing ${batches.length} SQL batch(es)...\n`);

        // Execute each batch
        for (let i = 0; i < batches.length; i++) {
            console.log(`   Batch ${i + 1}/${batches.length}...`);
            const result = await pool.request().query(batches[i]);

            // Show PRINT messages if any
            if (result.recordsets && result.recordsets.length > 0) {
                result.recordsets.forEach(recordset => {
                    if (recordset.length > 0) {
                        console.log('   📊 Results:', recordset);
                    }
                });
            }
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);
        if (error.precedingErrors) {
            console.error('Preceding errors:', error.precedingErrors);
        }
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Database connection closed.');
        }
    }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error('❌ Please provide a migration file name');
    console.error('Usage: node run-migration.js <migration-file>');
    console.error('Example: node run-migration.js 002-fix-unique-constraints.sql');
    process.exit(1);
}

// Run migration
runMigration(migrationFile);
