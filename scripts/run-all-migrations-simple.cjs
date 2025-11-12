#!/usr/bin/env node

const sql = require('mssql');
const path = require('path');

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
    }
};

async function runMigrations() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Check if template_subtype column exists
        console.log('\n📋 Checking if template_subtype column exists...');
        const checkColumn = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'regelingen_templates' 
            AND COLUMN_NAME = 'template_subtype'
        `);
        
        if (checkColumn.recordset.length === 0) {
            console.log('❌ Column template_subtype does not exist. Running migration 004...');
            
            // Add template_subtype column
            await pool.request().query(`
                ALTER TABLE dbo.regelingen_templates
                ADD template_subtype NVARCHAR(50) NULL
            `);
            console.log('✅ Added template_subtype column');
            
            // Create index
            await pool.request().query(`
                CREATE INDEX IX_regelingen_templates_subtype
                ON dbo.regelingen_templates(type, template_subtype, meervoud_kinderen, sort_order)
            `);
            console.log('✅ Created index on template_subtype');
        } else {
            console.log('✅ Column template_subtype already exists');
        }
        
        // Now fix the subtypes to match frontend
        console.log('\n🔧 Fixing template subtypes to match frontend...');
        
        const updates = [
            ['verjaardag_kinderen', 'verjaardag_kind'],
            ['verjaardag_ouders', 'verjaardag_partij1'],
            ['verjaardag_grootouders', 'verjaardag_partij2'],
            ['bijzondere_jubilea', 'bijzonder_jubileum']
        ];
        
        for (const [oldSubtype, newSubtype] of updates) {
            const result = await pool.request()
                .input('oldSubtype', sql.NVarChar, oldSubtype)
                .input('newSubtype', sql.NVarChar, newSubtype)
                .query(`
                    UPDATE dbo.regelingen_templates
                    SET template_subtype = @newSubtype
                    WHERE template_subtype = @oldSubtype
                `);
            
            console.log(`✅ Updated ${oldSubtype} → ${newSubtype} (${result.rowsAffected} rows)`);
        }
        
        // Show current subtypes
        console.log('\n📊 Current subtypes in database:');
        const currentSubtypes = await pool.request().query(`
            SELECT DISTINCT 
                template_subtype,
                COUNT(*) as template_count
            FROM dbo.regelingen_templates
            WHERE template_subtype IS NOT NULL
            GROUP BY template_subtype
            ORDER BY template_subtype
        `);
        
        console.table(currentSubtypes.recordset);
        
        console.log('\n✅ All migrations completed successfully!');
        
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

// Run the migrations
runMigrations().catch(console.error);