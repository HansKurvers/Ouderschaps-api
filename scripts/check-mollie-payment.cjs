/**
 * Check Mollie Payment Details
 * Shows webhook URL and webhook call history
 */

const createMollieClient = require('@mollie/api-client').default;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkMolliePayment() {
    const apiKey = process.env.MOLLIE_API_KEY || process.env.MOLLIE_API_KEY_LIVE;

    if (!apiKey) {
        console.error('❌ MOLLIE_API_KEY not found in environment');
        process.exit(1);
    }

    console.log('🔍 Checking Mollie Payment Details\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const client = createMollieClient({ apiKey });

    // Payment ID for Subscription 47
    const paymentId = 'tr_Z4mSPgEaXamSQWhxSZ2HJ';

    try {
        console.log(`📋 Payment ID: ${paymentId}\n`);

        // Get payment details
        const payment = await client.payments.get(paymentId);

        console.log('Payment Details:');
        console.log('  Status:', payment.status);
        console.log('  Amount:', payment.amount.value, payment.amount.currency);
        console.log('  Description:', payment.description);
        console.log('  Created:', payment.createdAt);
        console.log('  Paid:', payment.paidAt || 'Not paid');
        console.log('  Method:', payment.method || 'Not selected yet');
        console.log('  Customer ID:', payment.customerId || 'None');
        console.log('  Sequence Type:', payment.sequenceType || 'None');
        console.log('\n📡 Webhook Configuration:');
        console.log('  Webhook URL:', payment.webhookUrl || '❌ NOT SET!');
        console.log('\n📊 Metadata:');
        console.log(JSON.stringify(payment.metadata, null, 2));

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Check if webhook URL is correct
        const expectedWebhookUrl = 'https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/webhook';

        if (!payment.webhookUrl) {
            console.log('🚨 KRITIEK PROBLEEM: Webhook URL is NIET ingesteld!');
            console.log('   Mollie zal GEEN webhooks sturen naar de backend!\n');
        } else if (payment.webhookUrl !== expectedWebhookUrl) {
            console.log('⚠️  WARNING: Webhook URL komt niet overeen!');
            console.log('   Verwacht:', expectedWebhookUrl);
            console.log('   Werkelijk:', payment.webhookUrl, '\n');
        } else {
            console.log('✅ Webhook URL is CORRECT ingesteld\n');
        }

        // Try to get webhook details (not all Mollie plans support this)
        console.log('🔔 Webhook Call History:');
        console.log('   (Note: Details only available on Mollie Growth plan or higher)\n');

        if (payment.status === 'paid' && (!payment.webhookUrl)) {
            console.log('❌ DIAGNOSE: Payment is paid maar webhook URL ontbreekt');
            console.log('   → De webhook werd NOOIT aangeroepen door Mollie');
            console.log('   → De backend kreeg GEEN notificatie van de betaling');
            console.log('   → Daarom blijft subscription op "pending"\n');
        } else if (payment.status === 'paid' && payment.webhookUrl) {
            console.log('✅ Payment is paid en webhook URL is ingesteld');
            console.log('   → Mollie zou webhook moeten hebben aangeroepen');
            console.log('   → Als subscription nog pending is, dan faalt de webhook CODE\n');
        }

    } catch (error) {
        console.error('❌ Error fetching payment:', error.message);
        process.exit(1);
    }
}

checkMolliePayment().catch(console.error);
