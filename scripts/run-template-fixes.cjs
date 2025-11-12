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

async function fixTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        console.log('\n🔧 Fixing template texts...');
        
        // Fix ID 126
        await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET template_tekst = 'De kinderen vieren hun verjaardag bij degene waar zij op die dag volgens schema zijn.',
                card_tekst = 'De kinderen vieren verjaardag waar zij volgens schema zijn'
            WHERE id = 126
        `);
        console.log('✅ Fixed ID 126');
        
        // Fix ID 130
        await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET template_tekst = 'De verjaardagen van de kinderen worden in onderling overleg gevierd.',
                card_tekst = 'Verjaardagen kinderen in onderling overleg'
            WHERE id = 130
        `);
        console.log('✅ Fixed ID 130');
        
        // Fix ID 154
        await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET card_tekst = 'De kinderen kiezen zelf over bezoek grootouders'
            WHERE id = 154
        `);
        console.log('✅ Fixed ID 154');
        
        // Show fixed templates
        console.log('\n📋 Fixed templates:');
        const result = await pool.request().query(`
            SELECT id, template_tekst, card_tekst
            FROM dbo.regelingen_templates
            WHERE id IN (126, 130, 154)
        `);
        
        console.table(result.recordset);
        
        console.log('\n✅ All template fixes completed!');
        
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
fixTemplates().catch(console.error);