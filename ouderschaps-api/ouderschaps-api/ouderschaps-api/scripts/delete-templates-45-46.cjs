/**
 * Delete templates ID 45 and ID 46 (bij_grootouders duplicates)
 */

const sql = require('mssql');

const config = {
    server: 'sql-ouderschapsplan-server.database.windows.net',
    database: 'db-ouderschapsplan',
    user: 'sqladmin',
    password: 'jrWDaVQe9S7s2cv',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 60000
    }
};

async function deleteTemplates() {
    console.log('🗑️  Deleting templates ID 45 and ID 46...\n');

    let pool;

    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Step 1: Show what we're about to delete
        console.log('📋 Templates to be deleted:');
        const showQuery = `
            SELECT
                id,
                template_naam,
                CASE WHEN meervoud_kinderen = 1 THEN 'Meerdere kinderen' ELSE '1 kind' END as variant,
                type,
                sort_order,
                template_tekst
            FROM dbo.regelingen_templates
            WHERE id IN (45, 46)
        `;

        const showResult = await pool.request().query(showQuery);

        if (showResult.recordset.length === 0) {
            console.log('⚠️  Templates ID 45 and 46 not found. They may already be deleted.\n');
            return;
        }

        console.table(showResult.recordset);

        // Step 2: Delete templates
        console.log('\n🗑️  Deleting templates...');
        const deleteQuery = `
            DELETE FROM dbo.regelingen_templates
            WHERE id IN (45, 46)
        `;

        const deleteResult = await pool.request().query(deleteQuery);
        console.log(`✅ Deleted ${deleteResult.rowsAffected[0]} template(s)\n`);

        // Step 3: Verify deletion
        console.log('🔍 Verifying deletion...');
        const verifyResult = await pool.request().query(showQuery);

        if (verifyResult.recordset.length === 0) {
            console.log('✅ Templates successfully deleted!\n');
        } else {
            console.log('⚠️  Warning: Some templates still exist:');
            console.table(verifyResult.recordset);
        }

        // Step 4: Show remaining Feestdag templates
        console.log('📊 Remaining Feestdag templates (meerdere kinderen):\n');
        const remainingQuery = `
            SELECT
                id,
                template_naam,
                sort_order,
                LEFT(template_tekst, 70) as preview
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag'
              AND meervoud_kinderen = 1
            ORDER BY sort_order
        `;

        const remainingResult = await pool.request().query(remainingQuery);
        console.table(remainingResult.recordset);

        console.log('\n🎉 Cleanup complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

deleteTemplates()
    .then(() => {
        console.log('✅ Script completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
