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

async function removeEigenTekstTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // First, show what we're going to delete
        console.log('\n📋 Finding all "Eigen tekst invoeren" templates...');
        const findTemplates = await pool.request().query(`
            SELECT id, template_naam, type, template_subtype, meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE template_tekst = 'Eigen tekst invoeren'
               OR template_naam LIKE '%eigen_tekst%'
            ORDER BY type, template_subtype, id
        `);
        
        console.log(`Found ${findTemplates.recordset.length} "Eigen tekst" templates to remove:`);
        console.table(findTemplates.recordset);
        
        if (findTemplates.recordset.length === 0) {
            console.log('✅ No "Eigen tekst" templates found to remove.');
            return;
        }
        
        // Create backup before deletion
        console.log('\n💾 Creating backup of templates to be deleted...');
        const backupData = JSON.stringify(findTemplates.recordset, null, 2);
        const backupFile = `backup-eigen-tekst-templates-${new Date().toISOString().replace(/:/g, '-')}.json`;
        require('fs').writeFileSync(path.join(__dirname, backupFile), backupData);
        console.log(`✅ Backup saved to: ${backupFile}`);
        
        // Delete the templates
        console.log('\n🗑️  Deleting "Eigen tekst invoeren" templates...');
        const deleteResult = await pool.request().query(`
            DELETE FROM dbo.regelingen_templates
            WHERE template_tekst = 'Eigen tekst invoeren'
               OR template_naam LIKE '%eigen_tekst%'
        `);
        
        console.log(`✅ Deleted ${deleteResult.rowsAffected} templates`);
        
        // Show summary of remaining templates
        console.log('\n📊 Summary of remaining templates by type:');
        const summary = await pool.request().query(`
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
        
        console.table(summary.recordset);
        
        console.log('\n✅ All "Eigen tekst invoeren" templates have been removed!');
        console.log('💡 The frontend should now handle custom text input through its own logic.');
        
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
removeEigenTekstTemplates().catch(console.error);