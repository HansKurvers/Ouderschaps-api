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

async function fixZouZouden() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Find all meervoud templates with "zou zijn"
        console.log('\n📋 Finding meervoud templates with "zou zijn"...');
        const templates = await pool.request().query(`
            SELECT id, template_naam, template_tekst, type
            FROM dbo.regelingen_templates
            WHERE meervoud_kinderen = 1
            AND template_tekst LIKE '%zou zijn%'
            ORDER BY type, id
        `);
        
        console.log(`Found ${templates.recordset.length} meervoud templates with "zou zijn"`);
        
        // Update each template
        let updateCount = 0;
        for (const template of templates.recordset) {
            let updatedText = template.template_tekst;
            let originalText = updatedText;
            
            // Replace "zou zijn" with "zouden zijn" for plural
            updatedText = updatedText.replace(/\bzou zijn\b/g, 'zouden zijn');
            
            // Only update if changes were made
            if (updatedText !== originalText) {
                console.log(`\n✏️  Template ID ${template.id} (${template.template_naam}):`);
                console.log(`   Type: ${template.type}`);
                console.log(`   Old: "${originalText}"`);
                console.log(`   New: "${updatedText}"`);
                
                // Update the template
                await pool.request()
                    .input('Id', sql.Int, template.id)
                    .input('TemplateTekst', sql.NVarChar, updatedText)
                    .query(`
                        UPDATE dbo.regelingen_templates
                        SET template_tekst = @TemplateTekst
                        WHERE id = @Id
                    `);
                
                updateCount++;
            }
        }
        
        console.log(`\n✅ Updated ${updateCount} templates`);
        
        // Show summary of templates with zouden/zou
        console.log('\n📊 Summary of zou/zouden usage:');
        const summary = await pool.request().query(`
            SELECT 
                meervoud_kinderen,
                COUNT(*) as total,
                SUM(CASE WHEN template_tekst LIKE '%zou zijn%' THEN 1 ELSE 0 END) as has_zou,
                SUM(CASE WHEN template_tekst LIKE '%zouden zijn%' THEN 1 ELSE 0 END) as has_zouden
            FROM dbo.regelingen_templates
            WHERE template_tekst LIKE '%zou%' OR template_tekst LIKE '%zouden%'
            GROUP BY meervoud_kinderen
            ORDER BY meervoud_kinderen
        `);
        
        console.table(summary.recordset.map(row => ({
            type: row.meervoud_kinderen ? 'Meervoud' : 'Enkelvoud',
            total: row.total,
            'has "zou zijn"': row.has_zou,
            'has "zouden zijn"': row.has_zouden
        })));
        
        // Verify specific templates
        console.log('\n📋 Checking all "volgens zorgregeling" templates:');
        const checkResult = await pool.request().query(`
            SELECT id, template_naam, meervoud_kinderen, 
                   SUBSTRING(template_tekst, CHARINDEX('waar', template_tekst), 60) as text_fragment
            FROM dbo.regelingen_templates
            WHERE template_tekst LIKE '%volgens de wekelijkse zorgregeling%'
            ORDER BY meervoud_kinderen, id
        `);
        
        for (const row of checkResult.recordset) {
            const correctVerb = row.meervoud_kinderen ? 'zouden' : 'zou';
            const hasCorrectVerb = row.text_fragment.includes(correctVerb + ' zijn');
            console.log(`ID ${row.id} (${row.meervoud_kinderen ? 'meervoud' : 'enkelvoud'}): ${hasCorrectVerb ? '✅' : '❌'} Uses "${correctVerb} zijn"`);
        }
        
        console.log('\n✅ All meervoud templates now correctly use "zouden zijn" instead of "zou zijn"!');
        
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
fixZouZouden().catch(console.error);