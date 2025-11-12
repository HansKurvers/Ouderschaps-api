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

async function findAndFixHardcodedKinderen() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Find all templates with hardcoded "De kinderen" or "Het kind" that should use {KIND}
        console.log('\n🔍 Finding templates with hardcoded "De kinderen" or "Het kind"...');
        const findHardcoded = await pool.request().query(`
            SELECT 
                id, 
                template_naam,
                template_tekst,
                card_tekst,
                meervoud_kinderen,
                template_subtype
            FROM dbo.regelingen_templates
            WHERE 
                (template_tekst LIKE '%De kinderen%' AND meervoud_kinderen = 0)
                OR (template_tekst LIKE '%Het kind%' AND meervoud_kinderen = 1)
                OR (card_tekst LIKE '%De kinderen%' AND meervoud_kinderen = 0)
                OR (card_tekst LIKE '%Het kind%' AND meervoud_kinderen = 1)
            ORDER BY id
        `);
        
        console.log(`\nFound ${findHardcoded.recordset.length} templates with potential issues:\n`);
        
        if (findHardcoded.recordset.length > 0) {
            console.table(findHardcoded.recordset.map(r => ({
                id: r.id,
                template_naam: r.template_naam,
                meervoud_kinderen: r.meervoud_kinderen,
                issue: r.meervoud_kinderen === 0 ? 'Has "De kinderen" but is enkelvoud' : 'Has "Het kind" but is meervoud'
            })));
            
            console.log('\n🔧 Fixing templates...');
            
            // Fix enkelvoud templates that have "De kinderen"
            const fixEnkelvoud = await pool.request().query(`
                UPDATE dbo.regelingen_templates
                SET 
                    template_tekst = REPLACE(template_tekst, 'De kinderen', '{KIND}'),
                    card_tekst = REPLACE(card_tekst, 'De kinderen', '{KIND}')
                WHERE 
                    meervoud_kinderen = 0 
                    AND (template_tekst LIKE '%De kinderen%' OR card_tekst LIKE '%De kinderen%')
            `);
            
            console.log(`✅ Fixed ${fixEnkelvoud.rowsAffected} enkelvoud templates`);
            
            // Fix meervoud templates that have "Het kind"
            const fixMeervoud = await pool.request().query(`
                UPDATE dbo.regelingen_templates
                SET 
                    template_tekst = REPLACE(template_tekst, 'Het kind', '{KIND}'),
                    card_tekst = REPLACE(card_tekst, 'Het kind', '{KIND}')
                WHERE 
                    meervoud_kinderen = 1 
                    AND (template_tekst LIKE '%Het kind%' OR card_tekst LIKE '%Het kind%')
            `);
            
            console.log(`✅ Fixed ${fixMeervoud.rowsAffected} meervoud templates`);
        }
        
        // Also check for templates that don't use {KIND} at all when they should
        console.log('\n🔍 Checking templates that should use {KIND} placeholder...');
        const checkPlaceholder = await pool.request().query(`
            SELECT 
                id,
                template_naam,
                template_tekst,
                meervoud_kinderen,
                template_subtype
            FROM dbo.regelingen_templates
            WHERE 
                template_subtype IN ('bijzonder_jubileum', 'verjaardag_partij1', 'verjaardag_partij2')
                AND template_tekst NOT LIKE '%eigen tekst%'
                AND template_tekst NOT LIKE '%{KIND}%'
                AND template_tekst NOT LIKE '%partijen%'
            ORDER BY id
        `);
        
        if (checkPlaceholder.recordset.length > 0) {
            console.log(`\nFound ${checkPlaceholder.recordset.length} templates without {KIND} placeholder:`);
            console.table(checkPlaceholder.recordset);
        }
        
        // Show specific IDs mentioned by user
        console.log('\n📋 Checking specific IDs mentioned (158, 159, 162, 163):');
        const specificIds = await pool.request().query(`
            SELECT 
                id,
                template_tekst,
                card_tekst,
                meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE id IN (158, 159, 162, 163)
            ORDER BY id
        `);
        
        console.table(specificIds.recordset);
        
        console.log('\n✅ All fixes completed!');
        console.log('\n💡 Note: Templates zonder {KIND} placeholder in categorie jubilea/verjaardagen zijn waarschijnlijk correct');
        console.log('   omdat ze algemene afspraken betreffen, niet specifiek over het kind.');
        
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
findAndFixHardcodedKinderen().catch(console.error);