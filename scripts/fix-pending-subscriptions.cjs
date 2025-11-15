/**
 * Fix Pending Subscriptions
 *
 * This script activates all subscriptions that have been paid but are still
 * in 'pending' status due to the webhook bug (missing mandate for iDEAL payments).
 *
 * It will:
 * 1. Find all subscriptions with status='pending' that have a paid payment
 * 2. Activate those subscriptions (status='active')
 * 3. Set next payment date to 30 days from now
 * 4. Update user's has_active_subscription flag
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function fixPendingSubscriptions() {
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

    console.log('🔧 Fixing Pending Subscriptions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to database\n');

        // Step 1: Find all pending subscriptions with paid payments
        console.log('🔍 Finding pending subscriptions with paid payments...\n');

        const pendingWithPaid = await pool.request().query(`
            SELECT DISTINCT
                a.id as subscription_id,
                a.gebruiker_id,
                a.status as current_status,
                a.mollie_customer_id,
                a.mollie_subscription_id,
                b.id as payment_id,
                b.mollie_payment_id,
                b.bedrag,
                b.betaal_datum
            FROM dbo.abonnementen a
            INNER JOIN dbo.betalingen b ON a.id = b.abonnement_id
            WHERE a.status = 'pending'
              AND b.status = 'paid'
              AND a.mollie_subscription_id IS NULL
            ORDER BY a.id
        `);

        if (pendingWithPaid.recordset.length === 0) {
            console.log('✅ No pending subscriptions found with paid payments.');
            console.log('   All subscriptions are already in correct state!\n');
            return;
        }

        console.log(`📋 Found ${pendingWithPaid.recordset.length} subscriptions to fix:\n`);

        pendingWithPaid.recordset.forEach(sub => {
            console.log(`  • Subscription ${sub.subscription_id} (User ${sub.gebruiker_id})`);
            console.log(`    Payment: ${sub.mollie_payment_id} - €${sub.bedrag}`);
            console.log(`    Paid on: ${sub.betaal_datum}`);
            console.log('');
        });

        // Ask for confirmation
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('⚠️  This will activate these subscriptions and grant access.\n');

        // For automation, we'll proceed automatically
        // In production, you might want to add a confirmation prompt
        console.log('🚀 Proceeding with activation...\n');

        // Step 2: Update subscriptions to 'active' status
        const nextPaymentDate = new Date();
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 30); // 30 days from now

        const updateResult = await pool.request()
            .input('nextPayment', sql.Date, nextPaymentDate)
            .query(`
                UPDATE dbo.abonnementen
                SET
                    status = 'active',
                    volgende_betaling = @nextPayment,
                    gewijzigd_op = GETDATE()
                WHERE id IN (
                    SELECT DISTINCT a.id
                    FROM dbo.abonnementen a
                    INNER JOIN dbo.betalingen b ON a.id = b.abonnement_id
                    WHERE a.status = 'pending'
                      AND b.status = 'paid'
                      AND a.mollie_subscription_id IS NULL
                )
            `);

        console.log(`✅ Updated ${updateResult.rowsAffected[0]} subscriptions to 'active' status`);
        console.log(`   Next payment date set to: ${nextPaymentDate.toISOString().split('T')[0]}\n`);

        // Step 3: Update user flags
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

        console.log(`✅ Updated ${userUpdateResult.rowsAffected[0]} user flags to has_active_subscription=true\n`);

        // Step 4: Verify the fix
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🔍 VERIFICATION - Current Status:\n');

        const verification = await pool.request().query(`
            SELECT
                a.id as subscription_id,
                a.gebruiker_id,
                a.status,
                a.volgende_betaling,
                u.has_active_subscription,
                b.status as payment_status,
                b.betaal_datum
            FROM dbo.abonnementen a
            INNER JOIN dbo.betalingen b ON a.id = b.abonnement_id
            INNER JOIN dbo.gebruikers u ON a.gebruiker_id = u.id
            WHERE a.id IN (
                SELECT DISTINCT a.id
                FROM dbo.abonnementen a
                INNER JOIN dbo.betalingen b ON a.id = b.abonnement_id
                WHERE b.status = 'paid'
                  AND a.mollie_subscription_id IS NULL
            )
            ORDER BY a.id
        `);

        verification.recordset.forEach(row => {
            const statusIcon = row.status === 'active' ? '✅' : '❌';
            const userFlagIcon = row.has_active_subscription ? '✅' : '❌';

            console.log(`${statusIcon} Subscription ${row.subscription_id} (User ${row.gebruiker_id})`);
            console.log(`   Status: ${row.status}`);
            console.log(`   Next Payment: ${row.volgende_betaling?.toISOString().split('T')[0] || 'Not set'}`);
            console.log(`   User Has Access: ${userFlagIcon} ${row.has_active_subscription ? 'YES' : 'NO'}`);
            console.log('');
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('🎉 FIX COMPLETED SUCCESSFULLY!\n');
        console.log('Summary:');
        console.log(`  • ${updateResult.rowsAffected[0]} subscriptions activated`);
        console.log(`  • ${userUpdateResult.rowsAffected[0]} users granted access`);
        console.log(`  • Next payment due: ${nextPaymentDate.toISOString().split('T')[0]}`);
        console.log('\n✅ Users can now access the application!');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the script
fixPendingSubscriptions();
