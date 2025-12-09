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

async function addDefaultTemplateColumn() {
    let pool;

    try {
        console.log('Connecting to database...');
        pool = await sql.connect(config);
        console.log('Database connected');

        // Check if column already exists
        console.log('\nChecking if default_template_id column exists...');
        const columnCheck = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'zorg_situaties' AND COLUMN_NAME = 'default_template_id'
        `);

        if (columnCheck.recordset.length === 0) {
            console.log('Adding default_template_id column...');
            await pool.request().query(`
                ALTER TABLE dbo.zorg_situaties
                ADD default_template_id INT NULL
            `);
            console.log('Column added successfully');

            // Add foreign key constraint
            console.log('Adding foreign key constraint...');
            await pool.request().query(`
                ALTER TABLE dbo.zorg_situaties
                ADD CONSTRAINT FK_zorg_situaties_default_template
                FOREIGN KEY (default_template_id) REFERENCES dbo.regelingen_templates(id)
            `);
            console.log('Foreign key constraint added');
        } else {
            console.log('Column already exists, skipping...');
        }

        // Show current state
        console.log('\nCurrent zorg_situaties with vakantie category (6):');
        const situaties = await pool.request().query(`
            SELECT s.id, s.naam, s.default_template_id, t.template_naam
            FROM dbo.zorg_situaties s
            LEFT JOIN dbo.regelingen_templates t ON s.default_template_id = t.id
            WHERE s.zorg_categorie_id = 6
            ORDER BY s.id
        `);
        console.table(situaties.recordset);

        // Show available vakantie templates for reference
        console.log('\nAvailable Vakantie templates (for setting defaults):');
        const templates = await pool.request().query(`
            SELECT id, template_naam, sort_order
            FROM dbo.regelingen_templates
            WHERE type = 'Vakantie' AND meervoud_kinderen = 0
            ORDER BY sort_order
        `);
        console.table(templates.recordset);

        console.log('\nMigration complete!');
        console.log('To set a default template for a situatie, run:');
        console.log('  UPDATE dbo.zorg_situaties SET default_template_id = <template_id> WHERE id = <situatie_id>');

    } catch (error) {
        console.error('\nError:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\nDatabase connection closed');
        }
    }
}

// Run the script
addDefaultTemplateColumn().catch(console.error);
