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

async function cleanupTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // First, let's see what we have for Vaderdag
        console.log('\n📊 Current Vaderdag templates:');
        const vaderdagTemplates = await pool.request().query(`
            SELECT id, template_naam, template_tekst, meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE template_subtype = 'vaderdag'
            ORDER BY meervoud_kinderen, sort_order
        `);
        
        console.log('Found ' + vaderdagTemplates.recordset.length + ' Vaderdag templates');
        
        // Delete templates with hardcoded names "Baps" or "Marie José"
        console.log('\n🧹 Removing templates with hardcoded names...');
        const deleteHardcoded = await pool.request().query(`
            DELETE FROM dbo.regelingen_templates
            WHERE template_tekst LIKE '%Baps%' 
            OR template_tekst LIKE '%Marie José%'
        `);
        console.log(`✅ Removed ${deleteHardcoded.rowsAffected} templates with hardcoded names`);
        
        // Delete duplicate Moederdag templates for Vaderdag
        console.log('\n🧹 Removing incorrect Moederdag templates from Vaderdag...');
        const deleteMoederInVader = await pool.request().query(`
            DELETE FROM dbo.regelingen_templates
            WHERE template_subtype = 'vaderdag'
            AND template_tekst LIKE '%moeder%'
            AND template_tekst NOT LIKE '%beide ouders%'
        `);
        console.log(`✅ Removed ${deleteMoederInVader.rowsAffected} incorrect Moederdag templates`);
        
        // Delete templates with wrong placeholders like "De kinderen" in singular
        console.log('\n🧹 Fixing wrong placeholders...');
        const deleteWrongPlaceholders = await pool.request().query(`
            DELETE FROM dbo.regelingen_templates
            WHERE template_tekst LIKE '%waar De kinderen op%'
            OR template_tekst LIKE '%van De kinderen wordt%'
        `);
        console.log(`✅ Removed ${deleteWrongPlaceholders.rowsAffected} templates with wrong placeholders`);
        
        // Delete duplicate "Eigen tekst invoeren" keeping only one per subtype/meervoud combination
        console.log('\n🧹 Removing duplicate "Eigen tekst invoeren" entries...');
        const deleteDuplicateEigenTekst = await pool.request().query(`
            WITH DuplicateEigenTekst AS (
                SELECT 
                    id,
                    ROW_NUMBER() OVER (PARTITION BY template_subtype, meervoud_kinderen ORDER BY id) as rn
                FROM dbo.regelingen_templates
                WHERE template_tekst = 'Eigen tekst invoeren'
            )
            DELETE FROM dbo.regelingen_templates
            WHERE id IN (
                SELECT id FROM DuplicateEigenTekst WHERE rn > 1
            )
        `);
        console.log(`✅ Removed ${deleteDuplicateEigenTekst.rowsAffected} duplicate "Eigen tekst invoeren" entries`);
        
        // Show what remains
        console.log('\n📊 Templates remaining per subtype:');
        const summary = await pool.request().query(`
            SELECT 
                template_subtype,
                meervoud_kinderen,
                COUNT(*) as count
            FROM dbo.regelingen_templates
            WHERE template_subtype IS NOT NULL
            GROUP BY template_subtype, meervoud_kinderen
            ORDER BY template_subtype, meervoud_kinderen
        `);
        
        console.table(summary.recordset);
        
        // Show Vaderdag templates that remain
        console.log('\n📋 Remaining Vaderdag templates:');
        const remainingVaderdag = await pool.request().query(`
            SELECT template_tekst, meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE template_subtype = 'vaderdag'
            ORDER BY meervoud_kinderen, sort_order
        `);
        
        remainingVaderdag.recordset.forEach(t => {
            console.log(`${t.meervoud_kinderen ? '[Meervoud]' : '[Enkelvoud]'} ${t.template_tekst}`);
        });
        
        console.log('\n✅ Cleanup completed!');
        
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
cleanupTemplates().catch(console.error);