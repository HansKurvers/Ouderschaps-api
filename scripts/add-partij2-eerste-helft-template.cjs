/**
 * Add new template: partij2_eerste_helft
 * First half at PARTIJ2, second half at PARTIJ1
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

async function addNewTemplate() {
    console.log('🚀 Adding new template: partij2_eerste_helft\n');

    let pool;

    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Check if template already exists
        console.log('🔍 Checking if template already exists...');
        const checkQuery = `
            SELECT id, template_naam, meervoud_kinderen
            FROM dbo.regelingen_templates
            WHERE template_naam = 'partij2_eerste_helft'
              AND type = 'Feestdag'
        `;

        const checkResult = await pool.request().query(checkQuery);

        if (checkResult.recordset.length > 0) {
            console.log('⚠️  Template already exists:');
            console.table(checkResult.recordset);
            console.log('\nSkipping insertion.\n');
            return;
        }

        console.log('✅ Template does not exist yet. Proceeding with insertion...\n');

        // Insert template for 1 kind (meervoud_kinderen = 0)
        console.log('📝 Adding template for 1 kind (enkelvoud)...');
        const insertQuery1 = `
            INSERT INTO dbo.regelingen_templates (
                template_naam,
                template_tekst,
                meervoud_kinderen,
                type,
                sort_order
            )
            VALUES (
                'partij2_eerste_helft',
                'De eerste helft van {FEESTDAG} verblijft {KIND} bij {PARTIJ2} en de andere helft bij {PARTIJ1}',
                0,
                'Feestdag',
                25
            )
        `;

        await pool.request().query(insertQuery1);
        console.log('✅ Template added for 1 kind (enkelvoud)\n');

        // Insert template for meerdere kinderen (meervoud_kinderen = 1)
        console.log('📝 Adding template for meerdere kinderen (meervoud)...');
        const insertQuery2 = `
            INSERT INTO dbo.regelingen_templates (
                template_naam,
                template_tekst,
                meervoud_kinderen,
                type,
                sort_order
            )
            VALUES (
                'partij2_eerste_helft',
                'De eerste helft van {FEESTDAG} verblijven {KIND} bij {PARTIJ2} en de andere helft bij {PARTIJ1}',
                1,
                'Feestdag',
                25
            )
        `;

        await pool.request().query(insertQuery2);
        console.log('✅ Template added for meerdere kinderen (meervoud)\n');

        // Verify insertion
        console.log('🔍 Verifying new templates...\n');
        const verifyQuery = `
            SELECT
                id,
                template_naam,
                CASE WHEN meervoud_kinderen = 1 THEN 'Meerdere kinderen' ELSE '1 kind' END as variant,
                sort_order,
                template_tekst
            FROM dbo.regelingen_templates
            WHERE template_naam = 'partij2_eerste_helft'
              AND type = 'Feestdag'
            ORDER BY meervoud_kinderen
        `;

        const verifyResult = await pool.request().query(verifyQuery);
        console.log('✅ New templates successfully added:');
        console.table(verifyResult.recordset);

        // Show all Feestdag templates with new ones
        console.log('\n📊 All Feestdag templates (meerdere kinderen) with new template:\n');
        const allTemplatesQuery = `
            SELECT
                id,
                template_naam,
                sort_order,
                CASE WHEN template_naam = 'partij2_eerste_helft' THEN '← NEW!' ELSE '' END as marker,
                LEFT(template_tekst, 80) as preview
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag'
              AND meervoud_kinderen = 1
            ORDER BY sort_order
        `;

        const allResult = await pool.request().query(allTemplatesQuery);
        console.table(allResult.recordset);

        console.log('\n🎉 Success! New templates are ready to use in the application.');
        console.log('   Wait 5 minutes for cache to expire, or restart the backend.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Full error:', error);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

addNewTemplate()
    .then(() => {
        console.log('✅ Script completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
