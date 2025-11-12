/**
 * Find and Reorder Specific Template
 * Finds the "Benno en Carlo Eerste Kerstdag" template and puts it on top
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

async function findAndReorderTemplate() {
    console.log('🔍 Searching for "Benno en Carlo Eerste Kerstdag" template...\n');

    let pool;

    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Find the template
        const searchQuery = `
            SELECT
                id,
                template_naam,
                LEFT(template_tekst, 100) as tekst_preview,
                type,
                meervoud_kinderen,
                sort_order
            FROM dbo.regelingen_templates
            WHERE template_tekst LIKE '%Eerste Kerstdag%Benno%Carlo%oneven%Lars%even%Roos%'
        `;

        console.log('🔎 Executing search query...');
        const searchResult = await pool.request().query(searchQuery);

        if (searchResult.recordset.length === 0) {
            console.log('⚠️  No template found with that exact text.');
            console.log('   Searching for templates containing "Benno" and "Carlo"...\n');

            const broaderQuery = `
                SELECT
                    id,
                    template_naam,
                    LEFT(template_tekst, 100) as tekst_preview,
                    type,
                    meervoud_kinderen,
                    sort_order
                FROM dbo.regelingen_templates
                WHERE template_tekst LIKE '%Benno%'
                  AND template_tekst LIKE '%Carlo%'
            `;

            const broaderResult = await pool.request().query(broaderQuery);

            if (broaderResult.recordset.length === 0) {
                console.log('❌ No templates found containing "Benno" and "Carlo"');
                console.log('   The template might not exist yet in the database.\n');
                return;
            }

            console.log(`📋 Found ${broaderResult.recordset.length} template(s) with "Benno" and "Carlo":\n`);
            console.table(broaderResult.recordset);
            return;
        }

        console.log(`✅ Found ${searchResult.recordset.length} matching template(s):\n`);
        console.table(searchResult.recordset);

        const template = searchResult.recordset[0];
        const templateId = template.id;
        const currentSortOrder = template.sort_order;

        console.log(`\n📌 Template Details:`);
        console.log(`   ID: ${templateId}`);
        console.log(`   Name: ${template.template_naam}`);
        console.log(`   Type: ${template.type}`);
        console.log(`   Current sort_order: ${currentSortOrder}`);
        console.log(`   Meervoud kinderen: ${template.meervoud_kinderen ? 'Ja' : 'Nee'}\n`);

        // Show current order for this type
        console.log(`📊 Current order for type "${template.type}" (meervoud=${template.meervoud_kinderen}):\n`);

        const currentOrderQuery = `
            SELECT
                id,
                template_naam,
                sort_order,
                CASE WHEN id = @TemplateId THEN '← TARGET' ELSE '' END as marker
            FROM dbo.regelingen_templates
            WHERE type = @Type
              AND meervoud_kinderen = @MeervoudKinderen
            ORDER BY sort_order
        `;

        const orderRequest = pool.request();
        orderRequest.input('Type', sql.NVarChar, template.type);
        orderRequest.input('MeervoudKinderen', sql.Bit, template.meervoud_kinderen);
        orderRequest.input('TemplateId', sql.Int, templateId);

        const orderResult = await orderRequest.query(currentOrderQuery);
        console.table(orderResult.recordset);

        // Ask to move to top
        console.log(`\n🎯 Moving template ID ${templateId} to the TOP (sort_order = 5)...\n`);

        const updateQuery = `
            UPDATE dbo.regelingen_templates
            SET sort_order = 5
            WHERE id = @TemplateId
        `;

        const updateRequest = pool.request();
        updateRequest.input('TemplateId', sql.Int, templateId);

        await updateRequest.query(updateQuery);

        console.log('✅ Template moved to top!\n');

        // Show new order
        console.log(`📊 NEW order for type "${template.type}" (meervoud=${template.meervoud_kinderen}):\n`);

        const newOrderResult = await orderRequest.query(currentOrderQuery);
        console.table(newOrderResult.recordset);

        console.log('\n🎉 Success! The template is now at the top of the list.');
        console.log('   Wait 5 minutes for cache to expire, or restart the Azure Function.\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

findAndReorderTemplate()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
