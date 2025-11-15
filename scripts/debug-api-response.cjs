/**
 * Debug API Response
 * Simulates what the subscription/status API returns
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function debugAPIResponse(userId) {
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

    console.log(`🔍 Debugging API response for User ${userId}...\n`);

    let pool;
    try {
        pool = await sql.connect(config);

        // This is exactly what getSubscriptionByUserId does
        const result = await pool.request()
            .input('gebruiker_id', sql.Int, userId)
            .query(`
                SELECT TOP 1 *
                FROM dbo.abonnementen
                WHERE gebruiker_id = @gebruiker_id
                ORDER BY aangemaakt_op DESC
            `);

        const subscription = result.recordset[0] || null;

        console.log('📋 Query Result:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (!subscription) {
            console.log('❌ No subscription found for this user!');
            console.log('\n🔧 API would return:');
            console.log(JSON.stringify({
                hasActiveSubscription: false,
                subscription: null,
                recentPayments: [],
                nextPaymentDate: null
            }, null, 2));
            return;
        }

        console.log(`✅ Found subscription ID: ${subscription.id}`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Mollie Customer: ${subscription.mollie_customer_id}`);
        console.log(`   Mollie Subscription: ${subscription.mollie_subscription_id || 'NULL'}`);
        console.log(`   Start Date: ${subscription.start_datum}`);
        console.log(`   Trial End: ${subscription.trial_eind_datum}`);
        console.log(`   Next Payment: ${subscription.volgende_betaling || 'NULL'}`);
        console.log('');

        // Check payments
        const paymentsResult = await pool.request()
            .input('abonnement_id', sql.Int, subscription.id)
            .query(`
                SELECT *
                FROM dbo.betalingen
                WHERE abonnement_id = @abonnement_id
                ORDER BY aangemaakt_op DESC
            `);

        const payments = paymentsResult.recordset;
        const recentPayments = payments.slice(0, 5);

        console.log(`💳 Found ${payments.length} payment(s)`);
        if (payments.length > 0) {
            payments.forEach(p => {
                console.log(`   - Payment ${p.id}: ${p.status} (€${p.bedrag})`);
            });
        }
        console.log('');

        // Check trial period
        const now = new Date();
        const trialEndDate = subscription.trial_eind_datum ? new Date(subscription.trial_eind_datum) : null;
        const inTrialPeriod = trialEndDate ? now < trialEndDate : false;

        // This is what the API returns
        const apiResponse = {
            hasActiveSubscription: subscription.status === 'active',
            subscription: {
                id: subscription.id,
                planType: subscription.plan_type,
                status: subscription.status,
                startDatum: subscription.start_datum,
                eindDatum: subscription.eind_datum,
                trialEindDatum: subscription.trial_eind_datum,
                inTrialPeriod,
                maandelijksBedrag: subscription.maandelijks_bedrag,
                volgendeBetaling: subscription.volgende_betaling
            },
            recentPayments: recentPayments.map(p => ({
                id: p.id,
                bedrag: p.bedrag,
                status: p.status,
                betaalDatum: p.betaal_datum,
                aangemaaktOp: p.aangemaakt_op
            })),
            nextPaymentDate: subscription.volgende_betaling
        };

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🔧 API Response:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log(JSON.stringify(apiResponse, null, 2));
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (apiResponse.hasActiveSubscription) {
            console.log('✅ hasActiveSubscription: TRUE');
            console.log('   The frontend SHOULD allow access to dossiers!');
        } else {
            console.log('❌ hasActiveSubscription: FALSE');
            console.log(`   Status is: "${subscription.status}" (expected: "active")`);
            console.log('   The frontend will block access to dossiers!');
        }
        console.log('');

        // Check user flag
        const userResult = await pool.request()
            .input('id', sql.Int, userId)
            .query('SELECT has_active_subscription FROM dbo.gebruikers WHERE id = @id');

        if (userResult.recordset.length > 0) {
            const hasFlag = userResult.recordset[0].has_active_subscription;
            console.log(`👤 User has_active_subscription flag: ${hasFlag ? 'TRUE ✓' : 'FALSE ✗'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

const userId = process.argv[2] || 3;
debugAPIResponse(parseInt(userId));
