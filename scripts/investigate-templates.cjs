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

async function investigateTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Get ALL templates (not just bijzondere dagen)
        console.log('\n📊 ALL Feestdag templates in database:');
        const allTemplates = await pool.request().query(`
            SELECT 
                id,
                template_naam,
                template_tekst,
                template_subtype,
                meervoud_kinderen,
                type,
                sort_order
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag'
            ORDER BY 
                CASE 
                    WHEN template_subtype IS NULL THEN 0 
                    ELSE 1 
                END,
                template_subtype,
                meervoud_kinderen,
                sort_order
        `);
        
        console.log(`\nTotal templates found: ${allTemplates.recordset.length}`);
        
        // Group by subtype
        const templatesBySubtype = {};
        allTemplates.recordset.forEach(t => {
            const key = t.template_subtype || 'NO_SUBTYPE';
            if (!templatesBySubtype[key]) {
                templatesBySubtype[key] = [];
            }
            templatesBySubtype[key].push(t);
        });
        
        // Show templates per subtype
        for (const [subtype, templates] of Object.entries(templatesBySubtype)) {
            console.log(`\n=== ${subtype} (${templates.length} templates) ===`);
            templates.forEach(t => {
                console.log(`[${t.id}] ${t.meervoud_kinderen ? 'MEER' : 'ENK'} - ${t.template_tekst.substring(0, 80)}...`);
            });
        }
        
        // Check for templates with specific names
        console.log('\n🔍 Checking for hardcoded names...');
        const hardcodedCheck = await pool.request().query(`
            SELECT id, template_tekst
            FROM dbo.regelingen_templates
            WHERE template_tekst LIKE '%Baps%' 
            OR template_tekst LIKE '%Marie%'
            OR template_tekst LIKE '%José%'
        `);
        
        if (hardcodedCheck.recordset.length > 0) {
            console.log('❌ Found templates with hardcoded names:');
            hardcodedCheck.recordset.forEach(t => {
                console.log(`[${t.id}] ${t.template_tekst}`);
            });
        } else {
            console.log('✅ No templates with hardcoded names found');
        }
        
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
investigateTemplates().catch(console.error);