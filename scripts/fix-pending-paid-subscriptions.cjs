/**
 * CRITICAL FIX: Activate Pending Subscriptions with Paid Payments
 *
 * BUG: Webhook was not activating subscriptions after successful payment
 * IMPACT: Users paid but subscription stayed "pending" - couldn't access app
 *
 * This script fixes ALL existing pending subscriptions that have paid payments.
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function fixPendingPaidSubscriptions() {
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

    console.log('🚨 CRITICAL FIX: Activating Pending Subscriptions with Paid Payments');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // STEP 1: Find ALL pending subscriptions with paid payments
        console.log('📋 STEP 1: Finding pending subscriptions with paid payments...\n');

        const pendingWithPaid = await pool.request().query(`
            SELECT
                a.id as subscription_id,
                a.gebruiker_id,
                a.status as subscription_status,
                a.mollie_customer_id,
                a.start_datum,
                a.trial_eind_datum,
                b.id as payment_id,
                b.mollie_payment_id,
                b.bedrag,
                b.status as payment_status,
                b.betaal_datum
            FROM dbo.abonnementen a
            INNER JOIN dbo.betalingen b ON b.abonnement_id = a.id
            WHERE a.status = 'pending'
              AND b.status = 'paid'
              AND b.betaal_datum IS NOT NULL
            ORDER BY a.id
        `);

        if (pendingWithPaid.recordset.length === 0) {
            console.log('✅ No pending subscriptions with paid payments found.');
            console.log('   All subscriptions are correctly activated!\n');
            return;
        }

        console.log(`🔴 CRITICAL: Found ${pendingWithPaid.recordset.length} subscriptions that need fixing:\n`);

        pendingWithPaid.recordset.forEach(sub => {
            console.log(`  🔴 Subscription ${sub.subscription_id} (User ${sub.gebruiker_id})`);
            console.log(`     Status: ${sub.subscription_status} (should be active!)`);
            console.log(`     Payment: ${sub.mollie_payment_id}`);
            console.log(`     Amount: €${sub.bedrag}`);
            console.log(`     Paid: ${sub.betaal_datum.toISOString().split('T')[0]}`);
            console.log('');
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🔧 STEP 2: Activating subscriptions...\n');

        // STEP 2: Update subscriptions to 'active' status
        const nextPaymentDate = new Date();
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 30); // 30 days from now

        const updateResult = await pool.request()
            .input('nextPayment', sql.Date, nextPaymentDate)
            .query(`
                UPDATE a
                SET
                    a.status = 'active',
                    a.volgende_betaling = @nextPayment,
                    a.gewijzigd_op = GETDATE()
                FROM dbo.abonnementen a
                INNER JOIN dbo.betalingen b ON b.abonnement_id = a.id
                WHERE a.status = 'pending'
                  AND b.status = 'paid'
                  AND b.betaal_datum IS NOT NULL
            `);

        console.log(`✅ Activated ${updateResult.rowsAffected[0]} subscriptions`);
        console.log(`   Next payment date set to: ${nextPaymentDate.toISOString().split('T')[0]}\n`);

        // STEP 3: Update user flags
        console.log('🔧 STEP 3: Updating user access flags...\n');

        const userUpdateResult = await pool.request().query(`
            UPDATE dbo.gebruikers
            SET has_active_subscription = 1
            WHERE id IN (
                SELECT DISTINCT gebruiker_id
                FROM dbo.abonnementen
                WHERE status = 'active'
            )
            AND has_active_subscription = 0
        `);

        console.log(`✅ Updated ${userUpdateResult.rowsAffected[0]} user access flags\n`);

        // STEP 4: Verification
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ STEP 4: VERIFICATION - Current Status:\n');

        // Get IDs for verification
        const subscriptionIds = pendingWithPaid.recordset.map(r => r.subscription_id);

        const verification = await pool.request().query(`
            SELECT
                a.id as subscription_id,
                a.gebruiker_id,
                a.status as subscription_status,
                a.volgende_betaling,
                u.has_active_subscription,
                b.status as payment_status,
                b.bedrag,
                b.betaal_datum
            FROM dbo.abonnementen a
            INNER JOIN dbo.betalingen b ON b.abonnement_id = a.id
            INNER JOIN dbo.gebruikers u ON a.gebruiker_id = u.id
            WHERE b.status = 'paid'
              AND b.betaal_datum IS NOT NULL
              AND a.id IN (${subscriptionIds.join(',')})
            ORDER BY a.id
        `);

        verification.recordset.forEach(row => {
            const statusIcon = row.subscription_status === 'active' ? '✅' : '❌';
            const userFlagIcon = row.has_active_subscription ? '✅' : '❌';

            console.log(`${statusIcon} Subscription ${row.subscription_id} (User ${row.gebruiker_id})`);
            console.log(`   Subscription Status: ${row.subscription_status} ${statusIcon}`);
            console.log(`   Next Payment: ${row.volgende_betaling?.toISOString().split('T')[0] || 'Not set'}`);
            console.log(`   User Has Access: ${userFlagIcon} ${row.has_active_subscription ? 'YES' : 'NO'}`);
            console.log(`   Payment: €${row.bedrag} - ${row.payment_status} on ${row.betaal_datum.toISOString().split('T')[0]}`);
            console.log('');
        });

        // STEP 5: Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🎉 FIX COMPLETED SUCCESSFULLY!\n');
        console.log('📊 SUMMARY:');
        console.log(`   • ${updateResult.rowsAffected[0]} subscriptions activated`);
        console.log(`   • ${userUpdateResult.rowsAffected[0]} users granted access`);
        console.log(`   • Next payment date: ${nextPaymentDate.toISOString().split('T')[0]}`);
        console.log('');
        console.log('✅ All affected users can now access the application!');
        console.log('');
        console.log('🔧 NEXT STEPS:');
        console.log('   1. Deploy webhook fix to prevent future issues');
        console.log('   2. Test with new subscription to verify fix works');
        console.log('   3. Monitor logs for any remaining issues');
        console.log('');

    } catch (error) {
        console.error('\n🔴 ERROR:', error.message);
        console.error('\nStack trace:', error.stack);
        console.error('\n❌ FIX FAILED! Manual intervention required.');
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Database connection closed\n');
        }
    }
}

// Run the fix
console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  CRITICAL BUG FIX: Pending Subscriptions with Paid Payments  ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

fixPendingPaidSubscriptions();
