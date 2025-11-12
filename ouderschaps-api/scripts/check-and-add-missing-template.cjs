/**
 * Check and add missing partij2_eerste_helft template for multiple children
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

async function checkAndAdd() {
    console.log('🔍 Checking partij2_eerste_helft templates...\n');

    let pool;

    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Check both variants
        const checkQuery = `
            SELECT
                id,
                template_naam,
                CASE WHEN meervoud_kinderen = 1 THEN 'Meerdere kinderen' ELSE '1 kind' END as variant,
                meervoud_kinderen,
                sort_order,
                template_tekst
            FROM dbo.regelingen_templates
            WHERE template_naam = 'partij2_eerste_helft'
              AND type = 'Feestdag'
            ORDER BY meervoud_kinderen
        `;

        const result = await pool.request().query(checkQuery);

        console.log('📋 Current partij2_eerste_helft templates:');
        console.table(result.recordset);

        const hasEnkelvoud = result.recordset.some(r => r.meervoud_kinderen === false);
        const hasMeervoud = result.recordset.some(r => r.meervoud_kinderen === true);

        console.log(`\n✓ Has variant for 1 kind (enkelvoud): ${hasEnkelvoud ? 'YES' : 'NO'}`);
        console.log(`✓ Has variant for meerdere kinderen (meervoud): ${hasMeervoud ? 'YES' : 'NO'}\n`);

        // Add missing meervoud variant if needed
        if (!hasMeervoud) {
            console.log('📝 Adding missing template for meerdere kinderen...\n');

            const insertQuery = `
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

            await pool.request().query(insertQuery);
            console.log('✅ Template added for meerdere kinderen!\n');

            // Verify
            const verifyResult = await pool.request().query(checkQuery);
            console.log('📋 Updated templates:');
            console.table(verifyResult.recordset);
        } else {
            console.log('✅ Both variants already exist. Nothing to add.\n');
        }

        // Show all Feestdag templates
        console.log('\n📊 All Feestdag templates (meerdere kinderen):\n');
        const allQuery = `
            SELECT
                id,
                template_naam,
                sort_order,
                LEFT(template_tekst, 80) as preview
            FROM dbo.regelingen_templates
            WHERE type = 'Feestdag'
              AND meervoud_kinderen = 1
            ORDER BY sort_order
        `;

        const allResult = await pool.request().query(allQuery);
        console.table(allResult.recordset);

        console.log('\n🎉 All done!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

checkAndAdd()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
