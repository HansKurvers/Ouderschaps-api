#!/usr/bin/env node

const sql = require('mssql');
const fs = require('fs');
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

async function backupTemplates() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Get all templates
        console.log('\n📋 Fetching all templates...');
        const templates = await pool.request().query(`
            SELECT * FROM dbo.regelingen_templates
            ORDER BY id
        `);
        
        // Create backup file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(__dirname, `backup-templates-${timestamp}.json`);
        
        fs.writeFileSync(backupFile, JSON.stringify(templates.recordset, null, 2));
        
        console.log(`\n✅ Backup created: ${backupFile}`);
        console.log(`   Total templates backed up: ${templates.recordset.length}`);
        
        // Also create SQL restore script
        const sqlFile = path.join(__dirname, `backup-templates-${timestamp}.sql`);
        let sqlContent = '-- Restore script for regelingen_templates\n';
        sqlContent += '-- Generated on: ' + new Date().toISOString() + '\n\n';
        sqlContent += '-- First, clear the table\n';
        sqlContent += 'DELETE FROM dbo.regelingen_templates;\n\n';
        sqlContent += '-- Then insert backup data\n';
        
        for (const row of templates.recordset) {
            sqlContent += `INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (\n`;
            sqlContent += `  ${row.id},\n`;
            sqlContent += `  '${row.template_naam.replace(/'/g, "''")}',\n`;
            sqlContent += `  '${row.template_tekst.replace(/'/g, "''")}',\n`;
            sqlContent += `  ${row.meervoud_kinderen ? 1 : 0},\n`;
            sqlContent += `  '${row.type}',\n`;
            sqlContent += `  ${row.sort_order},\n`;
            sqlContent += `  ${row.card_tekst ? `'${row.card_tekst.replace(/'/g, "''")}'` : 'NULL'},\n`;
            sqlContent += `  ${row.template_subtype ? `'${row.template_subtype}'` : 'NULL'}\n`;
            sqlContent += `);\n`;
        }
        
        fs.writeFileSync(sqlFile, sqlContent);
        console.log(`✅ SQL restore script created: ${sqlFile}`);
        
        console.log('\n📌 To restore, run: node ${sqlFile}');
        
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
backupTemplates().catch(console.error);