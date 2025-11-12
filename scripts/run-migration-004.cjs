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
        const migrationPath = path.join(__dirname, '004_add_template_subtype_and_vaderdag.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('\n📄 Running migration 004: Add template_subtype and Vaderdag templates...\n');
        
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
        
        console.log('\n✅ Migration 004 completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- Added template_subtype column to dbo.regelingen_templates');
        console.log('- Created index on template_subtype for performance');
        console.log('- Inserted 12 Vaderdag-specific templates (6 enkelvoud + 6 meervoud)');
        console.log('\n🔗 You can now use the API with subtype filtering:');
        console.log('   GET /api/lookups/regelingen-templates?type=Feestdag&subtype=vaderdag');
        console.log('\n💡 To add Moederdag templates, create similar records with template_subtype="moederdag"');
        
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