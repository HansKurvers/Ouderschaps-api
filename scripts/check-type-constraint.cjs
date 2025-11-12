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

async function checkConstraint() {
    let pool;
    
    try {
        console.log('🔄 Connecting to database...');
        pool = await sql.connect(config);
        console.log('✅ Database connected');
        
        // Check constraint definition
        console.log('\n📋 Checking constraint definition...');
        const constraint = await pool.request().query(`
            SELECT 
                cc.name AS constraint_name,
                cc.definition
            FROM sys.check_constraints cc
            JOIN sys.tables t ON cc.parent_object_id = t.object_id
            WHERE t.name = 'regelingen_templates'
            AND cc.name LIKE '%type%'
        `);
        
        if (constraint.recordset.length > 0) {
            console.log('\n🔍 Constraint found:');
            console.table(constraint.recordset);
        }
        
        // Check distinct types currently in use
        console.log('\n📊 Current distinct types in database:');
        const types = await pool.request().query(`
            SELECT DISTINCT type, COUNT(*) as count
            FROM dbo.regelingen_templates
            GROUP BY type
            ORDER BY type
        `);
        
        console.table(types.recordset);
        
        // Check column definition
        console.log('\n📋 Column definition for type:');
        const columnDef = await pool.request().query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'regelingen_templates'
            AND COLUMN_NAME = 'type'
        `);
        
        console.table(columnDef.recordset);
        
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
checkConstraint().catch(console.error);