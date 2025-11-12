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

async function optimizeTemplatesPlanB() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        console.log('\n📌 Note: Using subtype for filtering instead of changing type due to database constraint');
        
        // Step 1: Clear card_tekst column
        console.log('\n📋 Step 1: Clearing card_tekst column...');
        const clearCardTekst = await pool.request().query(`
            UPDATE dbo.regelingen_templates
            SET card_tekst = NULL
        `);
        console.log(`✅ Cleared card_tekst for ${clearCardTekst.rowsAffected} templates`);
        
        // Show summary
        console.log('\n📊 Database optimization complete! Summary:');
        
        // Templates already processed:
        // - "Eigen tekst invoeren" deleted (12 records)
        // - Subtype 'algemeen' added to general templates
        
        // Count by subtype
        const subtypeSummary = await pool.request().query(`
            SELECT 
                template_subtype,
                COUNT(*) as template_count,
                SUM(CASE WHEN meervoud_kinderen = 0 THEN 1 ELSE 0 END) as enkelvoud,
                SUM(CASE WHEN meervoud_kinderen = 1 THEN 1 ELSE 0 END) as meervoud
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag'
            GROUP BY template_subtype
            ORDER BY 
                CASE 
                    WHEN template_subtype = 'algemeen' THEN 0
                    ELSE 1
                END,
                template_subtype
        `);
        
        console.log('\n📋 Templates breakdown by subtype:');
        console.table(subtypeSummary.recordset);
        
        // Total count
        const totalCount = await pool.request().query(`
            SELECT 
                COUNT(*) as total_templates,
                COUNT(DISTINCT template_subtype) as unique_subtypes
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag'
        `);
        
        console.log('\n📈 Total:');
        console.table(totalCount.recordset);
        
        console.log('\n✅ Database optimization complete!');
        console.log('\n🎯 Filtering strategy:');
        console.log('   - Normale feestdagen: WHERE type = "Feestdag" AND template_subtype = "algemeen"');
        console.log('   - Vaderdag: WHERE type = "Feestdag" AND template_subtype = "vaderdag"');
        console.log('   - Moederdag: WHERE type = "Feestdag" AND template_subtype = "moederdag"');
        console.log('   - Alle bijzondere dagen: WHERE type = "Feestdag" AND template_subtype != "algemeen"');
        console.log('\n📝 Changes made:');
        console.log('   ✓ Deleted all "Eigen tekst invoeren" templates');
        console.log('   ✓ Added subtype "algemeen" to general templates');
        console.log('   ✓ Cleared card_tekst column (redundant data)');
        console.log('\n⚠️  Frontend moet nu filteren op template_subtype!');
        
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
optimizeTemplatesPlanB().catch(console.error);