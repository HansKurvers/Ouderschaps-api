// Quick script to list all database tables
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
    },
};

async function listTables() {
    try {
        console.log('Connecting to database...');
        console.log('Server:', config.server);
        console.log('Database:', config.database);
        console.log('User:', config.user);

        await sql.connect(config);
        console.log('✅ Connected!\n');

        console.log('=== DATABASE TABLES ===\n');

        const tables = await sql.query`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo'
            ORDER BY TABLE_NAME
        `;

        console.log(`Found ${tables.recordset.length} tables:\n`);
        tables.recordset.forEach((row, index) => {
            console.log(`${index + 1}. ${row.TABLE_NAME}`);
        });

        console.log('\n\n=== DETAILED TABLE STRUCTURE ===\n');

        for (const table of tables.recordset) {
            const columns = await sql.query`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ${table.TABLE_NAME}
                ORDER BY ORDINAL_POSITION
            `;

            console.log(`\n${table.TABLE_NAME} (${columns.recordset.length} columns):`);
            columns.recordset.forEach(col => {
                const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
                const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
                console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}`);
            });
        }

        // Get row counts
        console.log('\n\n=== TABLE ROW COUNTS ===\n');
        for (const table of tables.recordset) {
            const result = await sql.query`
                SELECT COUNT(*) as count FROM ${sql.Table(table.TABLE_NAME)}
            `;
            console.log(`${table.TABLE_NAME}: ${result.recordset[0].count} rows`);
        }

    } catch (err) {
        console.error('❌ Database error:', err.message);
        console.error('Full error:', err);
    } finally {
        await sql.close();
    }
}

listTables();
