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

async function addZorgregelingTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Get the next sort_order for Feestdag templates
        console.log('\n📊 Getting current max sort_order...');
        const maxSortResult = await pool.request().query(`
            SELECT ISNULL(MAX(sort_order), 0) as maxSort 
            FROM dbo.regelingen_templates 
            WHERE type = 'Feestdag'
        `);
        const nextSortOrder = maxSortResult.recordset[0].maxSort + 10;
        
        console.log(`Next sort_order will be: ${nextSortOrder}`);
        
        // Insert enkelvoud template
        console.log('\n📋 Adding enkelvoud template...');
        const enkelvoudResult = await pool.request()
            .input('template_naam', sql.NVarChar, 'volgens_zorgregeling')
            .input('template_tekst', sql.NVarChar, '{KIND} verblijft deze {FEESTDAG} waar {KIND} zou zijn volgens de wekelijkse zorgregeling.')
            .input('meervoud_kinderen', sql.Bit, 0)
            .input('type', sql.NVarChar, 'Feestdag')
            .input('sort_order', sql.Int, nextSortOrder)
            .input('template_subtype', sql.NVarChar, 'algemeen')
            .query(`
                INSERT INTO dbo.regelingen_templates 
                (template_naam, template_tekst, meervoud_kinderen, type, sort_order, template_subtype)
                VALUES 
                (@template_naam, @template_tekst, @meervoud_kinderen, @type, @sort_order, @template_subtype)
            `);
        
        console.log('✅ Enkelvoud template added');
        
        // Insert meervoud template
        console.log('\n📋 Adding meervoud template...');
        const meervoudResult = await pool.request()
            .input('template_naam', sql.NVarChar, 'volgens_zorgregeling_meervoud')
            .input('template_tekst', sql.NVarChar, '{KIND} verblijven deze {FEESTDAG} waar {KIND} zou zijn volgens de wekelijkse zorgregeling.')
            .input('meervoud_kinderen', sql.Bit, 1)
            .input('type', sql.NVarChar, 'Feestdag')
            .input('sort_order', sql.Int, nextSortOrder)
            .input('template_subtype', sql.NVarChar, 'algemeen')
            .query(`
                INSERT INTO dbo.regelingen_templates 
                (template_naam, template_tekst, meervoud_kinderen, type, sort_order, template_subtype)
                VALUES 
                (@template_naam, @template_tekst, @meervoud_kinderen, @type, @sort_order, @template_subtype)
            `);
        
        console.log('✅ Meervoud template added');
        
        // Show all Feestdag templates
        console.log('\n📊 All Feestdag templates with subtype "algemeen":');
        const allTemplates = await pool.request().query(`
            SELECT 
                id,
                template_naam,
                template_tekst,
                meervoud_kinderen,
                sort_order
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag' AND template_subtype = 'algemeen'
            ORDER BY sort_order, meervoud_kinderen
        `);
        
        console.table(allTemplates.recordset.map(t => ({
            id: t.id,
            template_naam: t.template_naam,
            meervoud: t.meervoud_kinderen ? 'Ja' : 'Nee',
            template_tekst: t.template_tekst.substring(0, 60) + '...'
        })));
        
        console.log('\n✅ Templates successfully added!');
        console.log('   Feestdag templates now include "volgens de wekelijkse zorgregeling" option');
        
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
addZorgregelingTemplates().catch(console.error);