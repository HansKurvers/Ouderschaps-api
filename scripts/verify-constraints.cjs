/**
 * Verify Database Constraints
 * Checks if the unique constraints are correctly configured
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function verifyConstraints() {
    const config = {
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            encrypt: true,
            trustServerCertificate: false,
            enableArithAbort: true
        }
    };

    console.log('🔌 Connecting to Azure SQL Database...\n');

    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected successfully!\n');

        // Check for unique indexes on abonnementen table
        const query = `
            SELECT
                i.name AS IndexName,
                i.type_desc AS IndexType,
                i.is_unique AS IsUnique,
                i.has_filter AS HasFilter,
                i.filter_definition AS FilterDefinition,
                COL_NAME(ic.object_id, ic.column_id) AS ColumnName
            FROM sys.indexes i
            INNER JOIN sys.index_columns ic
                ON i.object_id = ic.object_id
                AND i.index_id = ic.index_id
            WHERE i.object_id = OBJECT_ID('dbo.abonnementen')
                AND i.is_unique = 1
            ORDER BY i.name, ic.key_ordinal;
        `;

        const result = await pool.request().query(query);

        console.log('📊 Unique Constraints/Indexes on dbo.abonnementen:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (result.recordset.length === 0) {
            console.log('⚠️  No unique constraints found!\n');
        } else {
            result.recordset.forEach(row => {
                console.log(`   Index: ${row.IndexName}`);
                console.log(`   Column: ${row.ColumnName}`);
                console.log(`   Type: ${row.IndexType}`);
                console.log(`   Is Unique: ${row.IsUnique ? 'Yes' : 'No'}`);
                console.log(`   Has Filter: ${row.HasFilter ? 'Yes' : 'No'}`);
                if (row.HasFilter) {
                    console.log(`   Filter: ${row.FilterDefinition}`);
                }
                console.log('');
            });
        }

        // Check if we can insert multiple NULL values
        console.log('🧪 Testing multiple NULL values insertion...\n');

        const testQuery = `
            SELECT COUNT(*) as NullCount
            FROM dbo.abonnementen
            WHERE mollie_customer_id IS NULL;
        `;

        const testResult = await pool.request().query(testQuery);
        const nullCount = testResult.recordset[0].NullCount;

        console.log(`   Current rows with NULL mollie_customer_id: ${nullCount}`);

        if (nullCount > 1) {
            console.log('   ✅ Multiple NULLs are allowed (constraint fixed!)\n');
        } else if (nullCount === 1) {
            console.log('   ⚠️  Only one NULL found. This might still be the old constraint.\n');
        } else {
            console.log('   ℹ️  No NULLs found yet. Constraint should allow multiple NULLs.\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ Verification complete!');

    } catch (error) {
        console.error('\n❌ Verification failed!');
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

verifyConstraints();
