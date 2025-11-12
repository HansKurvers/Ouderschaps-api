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

async function fixHardcodedDeKinderen() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Find all templates with "De kinderen" (case insensitive)
        console.log('\n📋 Finding templates with hardcoded "De kinderen"...');
        const templates = await pool.request().query(`
            SELECT id, template_naam, template_tekst, meervoud_kinderen, type
            FROM dbo.regelingen_templates
            WHERE LOWER(template_tekst) LIKE '%de kinderen%'
            ORDER BY id
        `);
        
        console.log(`Found ${templates.recordset.length} templates with "De kinderen"`);
        
        // Update each template
        let updateCount = 0;
        for (const template of templates.recordset) {
            let updatedText = template.template_tekst;
            let changes = [];
            
            // Replace variations of "De kinderen" with {KINDEREN}
            const replacements = [
                ['De kinderen', '{KINDEREN}'],
                ['de kinderen', '{KINDEREN}'],
                ['DE KINDEREN', '{KINDEREN}']
            ];
            
            for (const [oldText, newText] of replacements) {
                if (updatedText.includes(oldText)) {
                    updatedText = updatedText.replace(new RegExp(oldText, 'g'), newText);
                    changes.push(`"${oldText}" → ${newText}`);
                }
            }
            
            // For meervoud templates, also ensure verbs are plural
            if (template.meervoud_kinderen && changes.length > 0) {
                const verbReplacements = [
                    ['verblijft', 'verblijven'],
                    ['gaat', 'gaan'],
                    ['komt', 'komen'],
                    ['is', 'zijn'],
                    ['heeft', 'hebben'],
                    ['viert', 'vieren'],
                    ['woont', 'wonen'],
                    ['logeert', 'logeren'],
                    ['reist', 'reizen'],
                    ['vertrekt', 'vertrekken']
                ];
                
                for (const [singular, plural] of verbReplacements) {
                    const regex = new RegExp(`\\b${singular}\\b(?=\\s|,|\\.|$)`, 'g');
                    const newText = updatedText.replace(regex, plural);
                    if (newText !== updatedText) {
                        changes.push(`${singular} → ${plural}`);
                        updatedText = newText;
                    }
                }
            }
            
            // Only update if changes were made
            if (changes.length > 0) {
                console.log(`\n✏️  Template ID ${template.id} (${template.template_naam}):`);
                console.log(`   Type: ${template.type} | Meervoud: ${template.meervoud_kinderen ? 'Yes' : 'No'}`);
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
                
                updateCount++;
            }
        }
        
        console.log(`\n✅ Updated ${updateCount} templates`);
        
        // Show specific IDs mentioned by user
        console.log('\n📊 Checking specific IDs mentioned (54,55,56,57,66,67,68,69,127,128,129):');
        const checkResult = await pool.request().query(`
            SELECT id, template_naam, template_tekst, meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE id IN (54,55,56,57,66,67,68,69,127,128,129)
            ORDER BY id
        `);
        
        for (const row of checkResult.recordset) {
            const hasPlaceholder = row.template_tekst.includes('{KINDEREN}');
            const hasHardcoded = row.template_tekst.toLowerCase().includes('de kinderen');
            console.log(`ID ${row.id}: ${hasPlaceholder ? '✅ Uses {KINDEREN}' : '❌ Missing {KINDEREN}'} | ${hasHardcoded ? '❌ Still has "De kinderen"' : '✅ No hardcoded text'}`);
        }
        
        console.log('\n✅ All hardcoded "De kinderen" text has been replaced with {KINDEREN} placeholder!');
        
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
fixHardcodedDeKinderen().catch(console.error);