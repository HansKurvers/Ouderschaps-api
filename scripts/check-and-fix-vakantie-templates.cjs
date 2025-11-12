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

async function checkAndFixVakantieTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Check current Vakantie templates
        console.log('\n📋 Checking current Vakantie templates...');
        const currentTemplates = await pool.request().query(`
            SELECT 
                id,
                template_naam,
                template_tekst,
                meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE type = 'Vakantie'
            ORDER BY id
        `);
        
        console.log(`Found ${currentTemplates.recordset.length} Vakantie templates:`);
        console.table(currentTemplates.recordset);
        
        // Check if our new templates exist
        const checkNew = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM dbo.regelingen_templates
            WHERE type = 'Vakantie' 
            AND template_naam LIKE '%volgens_zorgregeling%'
        `);
        
        if (checkNew.recordset[0].count === 0) {
            console.log('\n❌ New templates not found! Adding them now...');
            
            // Get max sort_order
            const maxSort = await pool.request().query(`
                SELECT ISNULL(MAX(sort_order), 0) as maxSort 
                FROM dbo.regelingen_templates 
                WHERE type = 'Vakantie'
            `);
            const nextSort = maxSort.recordset[0].maxSort + 10;
            
            // Insert enkelvoud
            const result1 = await pool.request()
                .input('template_naam', sql.NVarChar, 'vakantie_volgens_zorgregeling')
                .input('template_tekst', sql.NVarChar, '{KIND} verblijft deze {VAKANTIE} waar {KIND} zou zijn volgens de wekelijkse zorgregeling.')
                .input('meervoud_kinderen', sql.Bit, 0)
                .input('type', sql.NVarChar, 'Vakantie')
                .input('sort_order', sql.Int, nextSort)
                .query(`
                    INSERT INTO dbo.regelingen_templates 
                    (template_naam, template_tekst, meervoud_kinderen, type, sort_order)
                    OUTPUT INSERTED.id, INSERTED.template_naam
                    VALUES 
                    (@template_naam, @template_tekst, @meervoud_kinderen, @type, @sort_order)
                `);
            
            console.log('✅ Added enkelvoud template:', result1.recordset[0]);
            
            // Insert meervoud
            const result2 = await pool.request()
                .input('template_naam', sql.NVarChar, 'vakantie_volgens_zorgregeling_meervoud')
                .input('template_tekst', sql.NVarChar, '{KIND} verblijven deze {VAKANTIE} waar {KIND} zou zijn volgens de wekelijkse zorgregeling.')
                .input('meervoud_kinderen', sql.Bit, 1)
                .input('type', sql.NVarChar, 'Vakantie')
                .input('sort_order', sql.Int, nextSort)
                .query(`
                    INSERT INTO dbo.regelingen_templates 
                    (template_naam, template_tekst, meervoud_kinderen, type, sort_order)
                    OUTPUT INSERTED.id, INSERTED.template_naam
                    VALUES 
                    (@template_naam, @template_tekst, @meervoud_kinderen, @type, @sort_order)
                `);
            
            console.log('✅ Added meervoud template:', result2.recordset[0]);
        } else {
            console.log('\n✅ Vakantie zorgregeling templates already exist');
        }
        
        // Show final state
        console.log('\n📊 Final Vakantie templates:');
        const finalTemplates = await pool.request().query(`
            SELECT 
                id,
                template_naam,
                template_tekst,
                meervoud_kinderen,
                sort_order
            FROM dbo.regelingen_templates
            WHERE type = 'Vakantie'
            ORDER BY sort_order, id
        `);
        
        console.table(finalTemplates.recordset.map(t => ({
            id: t.id,
            template_naam: t.template_naam,
            meervoud: t.meervoud_kinderen ? 'Ja' : 'Nee',
            template_preview: t.template_tekst.substring(0, 50) + '...'
        })));
        
        console.log(`\n✅ Total Vakantie templates: ${finalTemplates.recordset.length}`);
        
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
checkAndFixVakantieTemplates().catch(console.error);