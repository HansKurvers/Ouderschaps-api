#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database configuration
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

async function runMigration() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Read the SQL migration file
        const migrationPath = path.join(__dirname, '006_fix_template_subtypes.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('\n📄 Running migration 006: Fix template subtypes to match frontend...\n');
        
        // Split the SQL file by GO statements
        const sqlBatches = migrationSql
            .split(/\nGO\r?\n/i)
            .filter(batch => batch.trim().length > 0);
        
        // Execute each batch
        for (let i = 0; i < sqlBatches.length; i++) {
            const batch = sqlBatches[i];
            console.log(`📌 Executing batch ${i + 1}/${sqlBatches.length}...`);
            
            try {
                const result = await pool.request().query(batch);
                
                // Handle PRINT statements from SQL
                if (result.recordset) {
                    console.table(result.recordset);
                }
            } catch (error) {
                console.error(`❌ Error in batch ${i + 1}:`, error.message);
                throw error;
            }
        }
        
        console.log('\n✅ Migration 006 completed successfully!');
        console.log('\n📋 Subtypes updated to match frontend:');
        console.log('  ✓ verjaardag_kind (was: verjaardag_kinderen)');
        console.log('  ✓ verjaardag_partij1 (was: verjaardag_ouders)'); 
        console.log('  ✓ verjaardag_partij2 (was: verjaardag_grootouders)');
        console.log('  ✓ bijzonder_jubileum (was: bijzondere_jubilea)');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n🔒 Database connection closed');
        }
    }
}

// Run the migration
runMigration().catch(console.error);