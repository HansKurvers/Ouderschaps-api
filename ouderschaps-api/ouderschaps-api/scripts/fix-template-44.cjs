/**
 * Fix template ID 44 - change to correct "eerste helft" text
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

async function fixTemplate44() {
    console.log('🔧 Fixing template ID 44...\n');

    let pool;

    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Show current value
        console.log('📋 Current value of template ID 44:');
        const currentQuery = `
            SELECT
                id,
                template_naam,
                template_tekst,
                sort_order
            FROM dbo.regelingen_templates
            WHERE id = 44
        `;

        const currentResult = await pool.request().query(currentQuery);
        console.table(currentResult.recordset);

        // Update template
        console.log('\n📝 Updating template ID 44 to correct text...');
        const updateQuery = `
            UPDATE dbo.regelingen_templates
            SET template_tekst = 'De eerste helft van {FEESTDAG} verblijft {KIND} bij {PARTIJ2} en de andere helft bij {PARTIJ1}',
                sort_order = 25
            WHERE id = 44
        `;

        await pool.request().query(updateQuery);
        console.log('✅ Template updated!\n');

        // Show new value
        console.log('📋 New value of template ID 44:');
        const newResult = await pool.request().query(currentQuery);
        console.table(newResult.recordset);

        // Show both variants
        console.log('\n📊 Both partij2_eerste_helft variants:\n');
        const bothQuery = `
            SELECT
                id,
                template_naam,
                CASE WHEN meervoud_kinderen = 1 THEN 'Meerdere' ELSE '1 kind' END as variant,
                sort_order,
                template_tekst
            FROM dbo.regelingen_templates
            WHERE template_naam = 'partij2_eerste_helft'
              AND type = 'Feestdag'
            ORDER BY meervoud_kinderen
        `;

        const bothResult = await pool.request().query(bothQuery);
        console.table(bothResult.recordset);

        console.log('\n🎉 Template fixed successfully!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

fixTemplate44()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
