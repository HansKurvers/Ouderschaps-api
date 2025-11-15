/**
 * Check Subscription Status
 * Quickly check the status of subscriptions in the database
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkStatus() {
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

    console.log('🔌 Connecting to database...\n');

    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected!\n');

        // Check subscriptions
        console.log('📊 SUBSCRIPTIONS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const subs = await pool.request().query(`
            SELECT
                id,
                gebruiker_id,
                status,
                mollie_customer_id,
                mollie_subscription_id,
                start_datum,
                trial_eind_datum,
                aangemaakt_op
            FROM dbo.abonnementen
            ORDER BY aangemaakt_op DESC
        `);

        subs.recordset.forEach(sub => {
            console.log(`Subscription ID: ${sub.id}`);
            console.log(`  User ID: ${sub.gebruiker_id}`);
            console.log(`  Status: ${sub.status}`);
            console.log(`  Mollie Customer: ${sub.mollie_customer_id}`);
            console.log(`  Mollie Subscription: ${sub.mollie_subscription_id}`);
            console.log(`  Start Date: ${sub.start_datum}`);
            console.log(`  Trial End: ${sub.trial_eind_datum}`);
            console.log(`  Created: ${sub.aangemaakt_op}`);
            console.log('');
        });

        // Check payments
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('💳 PAYMENTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const payments = await pool.request().query(`
            SELECT
                p.id,
                p.abonnement_id,
                p.mollie_payment_id,
                p.bedrag,
                p.status,
                p.betaal_datum,
                p.aangemaakt_op
            FROM dbo.betalingen p
            ORDER BY p.aangemaakt_op DESC
        `);

        payments.recordset.forEach(payment => {
            console.log(`Payment ID: ${payment.id}`);
            console.log(`  Subscription ID: ${payment.abonnement_id}`);
            console.log(`  Mollie Payment: ${payment.mollie_payment_id}`);
            console.log(`  Amount: €${payment.bedrag}`);
            console.log(`  Status: ${payment.status}`);
            console.log(`  Paid Date: ${payment.betaal_datum || 'Not paid yet'}`);
            console.log(`  Created: ${payment.aangemaakt_op}`);
            console.log('');
        });

        // Check user subscription flags
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('👥 USERS WITH SUBSCRIPTIONS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const users = await pool.request().query(`
            SELECT
                id,
                naam,
                email,
                has_active_subscription
            FROM dbo.gebruikers
            WHERE has_active_subscription = 1 OR id IN (SELECT gebruiker_id FROM dbo.abonnementen)
        `);

        users.recordset.forEach(user => {
            console.log(`User ID: ${user.id}`);
            console.log(`  Name: ${user.naam || 'N/A'}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Has Active Subscription: ${user.has_active_subscription ? 'YES ✓' : 'NO ✗'}`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

checkStatus();
