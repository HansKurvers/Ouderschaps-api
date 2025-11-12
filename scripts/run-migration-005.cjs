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
        const migrationPath = path.join(__dirname, '005_add_all_bijzondere_dagen_templates.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('\n📄 Running migration 005: Add all bijzondere dagen templates...\n');
        
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
        
        console.log('\n✅ Migration 005 completed successfully!');
        console.log('\n📋 Summary of templates added:');
        console.log('- Moederdag: 12 templates (6 enkelvoud + 6 meervoud)');
        console.log('- Verjaardag kinderen: 12 templates (6 enkelvoud + 6 meervoud)');
        console.log('- Verjaardag ouders: 12 templates (6 enkelvoud + 6 meervoud)');
        console.log('- Verjaardag grootouders: 12 templates (6 enkelvoud + 6 meervoud)');
        console.log('- Bijzondere jubilea: 12 templates (6 enkelvoud + 6 meervoud)');
        console.log('\n🎉 Total: 60 nieuwe templates!');
        
        console.log('\n🔗 API endpoints voor elke bijzondere dag:');
        console.log('   GET /api/lookups/regelingen-templates?type=Feestdag&subtype=moederdag');
        console.log('   GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_kinderen');
        console.log('   GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_ouders');
        console.log('   GET /api/lookups/regelingen-templates?type=Feestdag&subtype=verjaardag_grootouders');
        console.log('   GET /api/lookups/regelingen-templates?type=Feestdag&subtype=bijzondere_jubilea');
        
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