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

async function addSubtypes() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Update Vakantie templates (16-27, 170-171)
        console.log('\n📋 Adding subtype "vakantie" to Vakantie templates...');
        const vakantieResult = await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET template_subtype = 'vakantie'
            WHERE id IN (16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 170, 171)
            AND type = 'Vakantie'
        `);
        console.log(`✅ Updated ${vakantieResult.rowsAffected} Vakantie templates with subtype "vakantie"`);
        
        // Update Algemeen/Beslissing templates (36-43)
        console.log('\n📋 Adding subtype "beslissing" to Algemeen templates...');
        const beslissingResult = await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET template_subtype = 'beslissing'
            WHERE id IN (36, 37, 38, 39, 40, 41, 42, 43)
            AND type = 'Algemeen'
        `);
        console.log(`✅ Updated ${beslissingResult.rowsAffected} Algemeen templates with subtype "beslissing"`);
        
        // Show summary
        console.log('\n📊 Summary of templates with subtypes:');
        const summary = await pool.request().query(`
            SELECT 
                type,
                template_subtype,
                COUNT(*) as count,
                STRING_AGG(CAST(id AS VARCHAR), ', ') as ids
            FROM dbo.regelingen_templates
            GROUP BY type, template_subtype
            ORDER BY type, template_subtype
        `);
        
        console.table(summary.recordset);
        
        console.log('\n✅ Subtypes successfully added!');
        console.log('   - Vakantie templates now have subtype "vakantie"');
        console.log('   - Algemeen templates now have subtype "beslissing"');
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n🔒 Database connection closed');
        }
    }
}

// Run the script
addSubtypes().catch(console.error);