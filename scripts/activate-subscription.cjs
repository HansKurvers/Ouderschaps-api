/**
 * Manually Activate Subscription
 * Activates a paid subscription that didn't get activated by webhook
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function activateSubscription(subscriptionId) {
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

        // Get subscription
        const subResult = await pool.request()
            .input('id', sql.Int, subscriptionId)
            .query('SELECT * FROM dbo.abonnementen WHERE id = @id');

        if (subResult.recordset.length === 0) {
            console.log('❌ Subscription not found!');
            return;
        }

        const subscription = subResult.recordset[0];
        console.log(`📋 Subscription ${subscriptionId}:`);
        console.log(`   User ID: ${subscription.gebruiker_id}`);
        console.log(`   Current Status: ${subscription.status}`);
        console.log('');

        // Check if there's a paid payment
        const paymentResult = await pool.request()
            .input('abonnement_id', sql.Int, subscriptionId)
            .query('SELECT * FROM dbo.betalingen WHERE abonnement_id = @abonnement_id AND status = \'paid\'');

        if (paymentResult.recordset.length === 0) {
            console.log('❌ No paid payment found for this subscription!');
            return;
        }

        console.log('✅ Found paid payment!');
        console.log('');

        // Calculate next payment date (7 days trial)
        const nextPayment = new Date();
        nextPayment.setDate(nextPayment.getDate() + 7);

        // Update subscription to active
        await pool.request()
            .input('id', sql.Int, subscriptionId)
            .input('status', sql.NVarChar(20), 'active')
            .input('volgende_betaling', sql.Date, nextPayment)
            .query(`
                UPDATE dbo.abonnementen
                SET status = @status,
                    volgende_betaling = @volgende_betaling,
                    gewijzigd_op = GETDATE()
                WHERE id = @id
            `);

        console.log('✅ Subscription status updated to ACTIVE');
        console.log(`   Next payment date: ${nextPayment.toISOString().split('T')[0]}`);
        console.log('');

        // Update user's subscription flag
        await pool.request()
            .input('gebruiker_id', sql.Int, subscription.gebruiker_id)
            .query(`
                UPDATE dbo.gebruikers
                SET has_active_subscription = 1
                WHERE id = @gebruiker_id
            `);

        console.log(`✅ User ${subscription.gebruiker_id} subscription flag updated`);
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Subscription successfully activated!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

const subscriptionId = process.argv[2];

if (!subscriptionId) {
    console.error('❌ Please provide a subscription ID');
    console.error('Usage: node activate-subscription.cjs <subscriptionId>');
    console.error('Example: node activate-subscription.cjs 29');
    process.exit(1);
}

activateSubscription(parseInt(subscriptionId));
