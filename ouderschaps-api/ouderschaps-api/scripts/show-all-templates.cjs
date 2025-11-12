/**
 * Show All Templates
 * Displays all regelingen templates with their current sort order
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

async function showAllTemplates() {
    console.log('📋 Fetching all regelingen templates...\n');

    let pool;

    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Get all templates grouped by type
        const query = `
            SELECT
                id,
                template_naam,
                type,
                meervoud_kinderen,
                sort_order,
                LEFT(template_tekst, 80) as tekst_preview
            FROM dbo.regelingen_templates
            ORDER BY type, meervoud_kinderen, sort_order
        `;

        const result = await pool.request().query(query);

        console.log(`📊 Found ${result.recordset.length} templates in database\n`);

        // Group by type
        const grouped = result.recordset.reduce((acc, template) => {
            const key = `${template.type} (${template.meervoud_kinderen ? 'meerdere kinderen' : '1 kind'})`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(template);
            return acc;
        }, {});

        // Display each group
        for (const [groupName, templates] of Object.entries(grouped)) {
            console.log(`\n═══ ${groupName} ═══\n`);
            console.table(templates.map(t => ({
                id: t.id,
                template_naam: t.template_naam,
                sort_order: t.sort_order,
                tekst_preview: t.tekst_preview
            })));
        }

        console.log('\n💡 To move a template to the top, use:');
        console.log('   UPDATE dbo.regelingen_templates SET sort_order = 5 WHERE id = <YOUR_ID>;\n');

        console.log('📝 Example: Move template ID 123 to top position:');
        console.log('   UPDATE dbo.regelingen_templates SET sort_order = 5 WHERE id = 123;\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

showAllTemplates()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
