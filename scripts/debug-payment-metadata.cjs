/**
 * Debug Payment Metadata
 * Check what metadata Mollie has for a specific payment
 */

const createMollieClient = require('@mollie/api-client').default;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function debugPayment() {
    const paymentId = process.argv[2] || 'tr_u8KernRwTgNnPeS6ktzGJ'; // Most recent paid payment

    console.log('🔍 Debugging payment:', paymentId);
    console.log('');

    try {
        const mollieClient = createMollieClient({
            apiKey: process.env.MOLLIE_API_KEY || process.env.MOLLIE_API_KEY_LIVE
        });

        const payment = await mollieClient.payments.get(paymentId);

        console.log('📋 PAYMENT DETAILS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('Payment ID:', payment.id);
        console.log('Status:', payment.status);
        console.log('Amount:', payment.amount.value, payment.amount.currency);
        console.log('Description:', payment.description);
        console.log('Customer ID:', payment.customerId || 'NOT SET ❌');
        console.log('Sequence Type:', payment.sequenceType || 'NOT SET ❌');
        console.log('Method:', payment.method);
        console.log('Checkout URL:', payment.getCheckoutUrl());
        console.log('');

        console.log('🏷️  METADATA:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        if (payment.metadata) {
            console.log(JSON.stringify(payment.metadata, null, 2));
        } else {
            console.log('NO METADATA ❌');
        }
        console.log('');

        // Check if customer exists and has mandates
        if (payment.customerId) {
            console.log('👤 CUSTOMER & MANDATES:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            const customer = await mollieClient.customers.get(payment.customerId);
            console.log('Customer:', customer.name);
            console.log('Email:', customer.email);
            console.log('');

            const mandates = await mollieClient.customerMandates.page({ customerId: payment.customerId });
            console.log('Mandates:', mandates.length);
            mandates.forEach(mandate => {
                console.log(`  - ${mandate.id}: ${mandate.status} (${mandate.method})`);
            });
            console.log('');
        }

        console.log('✅ Done!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

debugPayment();
