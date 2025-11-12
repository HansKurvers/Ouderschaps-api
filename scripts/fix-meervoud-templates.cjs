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

async function fixMeervoudTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // First, let's see what templates have meervoudKinderen=true
        console.log('\n📋 Finding templates with meervoudKinderen=true...');
        const meervoudTemplates = await pool.request().query(`
            SELECT id, template_naam, template_tekst, type
            FROM dbo.regelingen_templates
            WHERE meervoud_kinderen = 1
            ORDER BY type, id
        `);
        
        console.log(`Found ${meervoudTemplates.recordset.length} templates with meervoudKinderen=true`);
        
        // Update each template
        for (const template of meervoudTemplates.recordset) {
            let updatedText = template.template_tekst;
            let changes = [];
            
            // Replace {KIND} with {KINDEREN}
            if (updatedText.includes('{KIND}')) {
                updatedText = updatedText.replace(/{KIND}/g, '{KINDEREN}');
                changes.push('{KIND} → {KINDEREN}');
            }
            
            // Fix verb conjugations for plural
            const verbReplacements = [
                // Common patterns
                ['verblijft', 'verblijven'],
                ['gaat', 'gaan'],
                ['komt', 'komen'],
                ['is', 'zijn'],
                ['heeft', 'hebben'],
                ['viert', 'vieren'],
                ['woont', 'wonen'],
                ['logeert', 'logeren'],
                ['reist', 'reizen'],
                ['vertrekt', 'vertrekken'],
                // Context specific replacements
                ['Het kind', 'De kinderen'],
                ['het kind', 'de kinderen']
            ];
            
            for (const [singular, plural] of verbReplacements) {
                // Only replace if followed by space or punctuation
                const regex = new RegExp(`\\b${singular}\\b(?=\\s|,|\\.|$)`, 'g');
                const newText = updatedText.replace(regex, plural);
                if (newText !== updatedText) {
                    changes.push(`${singular} → ${plural}`);
                    updatedText = newText;
                }
            }
            
            // Only update if changes were made
            if (changes.length > 0) {
                console.log(`\n✏️  Template ID ${template.id} (${template.template_naam}):`);
                console.log(`   Type: ${template.type}`);
                console.log(`   Changes: ${changes.join(', ')}`);
                console.log(`   Old: "${template.template_tekst}"`);
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
            }
        }
        
        // Show final summary
        console.log('\n📊 Summary of meervoud templates after update:');
        const summary = await pool.request().query(`
            SELECT 
                type,
                COUNT(*) as total,
                SUM(CASE WHEN template_tekst LIKE '%{KINDEREN}%' THEN 1 ELSE 0 END) as has_kinderen_placeholder,
                SUM(CASE WHEN template_tekst LIKE '%verblijven%' OR template_tekst LIKE '%gaan%' OR template_tekst LIKE '%komen%' THEN 1 ELSE 0 END) as has_plural_verbs
            FROM dbo.regelingen_templates
            WHERE meervoud_kinderen = 1
            GROUP BY type
            ORDER BY type
        `);
        
        console.table(summary.recordset);
        
        console.log('\n✅ Meervoud templates fixed!');
        
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
fixMeervoudTemplates().catch(console.error);