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

async function optimizeTemplatesDatabase() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Step 1: Delete all "Eigen tekst invoeren" templates
        console.log('\n📋 Step 1: Removing "Eigen tekst invoeren" templates...');
        const deleteEigenTekst = await pool.request().query(`
            DELETE FROM dbo.regelingen_templates
            WHERE template_tekst = 'Eigen tekst invoeren'
        `);
        console.log(`✅ Removed ${deleteEigenTekst.rowsAffected} "Eigen tekst invoeren" templates`);
        
        // Step 2: Add subtype 'algemeen' to templates without subtype
        console.log('\n📋 Step 2: Adding subtype "algemeen" to general templates...');
        const updateAlgemeen = await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET template_subtype = 'algemeen'
            WHERE template_subtype IS NULL
            AND type = 'Feestdag'
        `);
        console.log(`✅ Updated ${updateAlgemeen.rowsAffected} templates with subtype "algemeen"`);
        
        // Step 3: Change type to 'Bijzondere dag' for special occasions
        console.log('\n📋 Step 3: Changing type to "Bijzondere dag" for special templates...');
        const updateBijzondereDag = await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET type = 'Bijzondere dag'
            WHERE template_subtype IN ('vaderdag', 'moederdag', 'verjaardag_kind', 
                                      'verjaardag_partij1', 'verjaardag_partij2', 
                                      'bijzonder_jubileum')
        `);
        console.log(`✅ Updated ${updateBijzondereDag.rowsAffected} templates to type "Bijzondere dag"`);
        
        // Step 4: Clear card_tekst column (safer than dropping)
        console.log('\n📋 Step 4: Clearing card_tekst column...');
        const clearCardTekst = await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET card_tekst = NULL
        `);
        console.log(`✅ Cleared card_tekst for ${clearCardTekst.rowsAffected} templates`);
        
        // Show summary
        console.log('\n📊 Database optimization complete! Summary:');
        
        // Count by type
        const typeSummary = await pool.request().query(`
            SELECT 
                type,
                COUNT(*) as count,
                STRING_AGG(DISTINCT template_subtype, ', ') as subtypes
            FROM dbo.regelingen_templates
            GROUP BY type
            ORDER BY type
        `);
        
        console.log('\n📈 Templates by type:');
        console.table(typeSummary.recordset);
        
        // Count by subtype
        const subtypeSummary = await pool.request().query(`
            SELECT 
                type,
                template_subtype,
                COUNT(*) as template_count,
                SUM(CASE WHEN meervoud_kinderen = 0 THEN 1 ELSE 0 END) as enkelvoud,
                SUM(CASE WHEN meervoud_kinderen = 1 THEN 1 ELSE 0 END) as meervoud
            FROM dbo.regelingen_templates
            GROUP BY type, template_subtype
            ORDER BY type, template_subtype
        `);
        
        console.log('\n📋 Detailed breakdown:');
        console.table(subtypeSummary.recordset);
        
        console.log('\n✅ Database optimization complete!');
        console.log('\n🎯 Filtering is now simple:');
        console.log('   - Normale feestdagen: WHERE type = "Feestdag"');
        console.log('   - Bijzondere dagen: WHERE type = "Bijzondere dag"');
        console.log('   - Specific bijzondere dag: WHERE type = "Bijzondere dag" AND template_subtype = "vaderdag"');
        
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
optimizeTemplatesDatabase().catch(console.error);