/**
 * Test Subscription Status API
 * Tests if the API returns correct subscription status
 */

const https = require('https');

async function testAPI(userId) {
    console.log('🧪 Testing Subscription Status API...\n');
    console.log(`   API: https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/status`);
    console.log(`   Testing for User ID: ${userId}\n`);

    // Note: In development mode (SKIP_AUTH=true), the API uses DEV_USER_ID from env
    // So we're testing without auth header

    const options = {
        hostname: 'ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net',
        path: '/api/subscription/status',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`📊 Response Status: ${res.statusCode}\n`);

                try {
                    const response = JSON.parse(data);
                    console.log('📋 Response Body:');
                    console.log(JSON.stringify(response, null, 2));
                    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

                    if (response.success && response.data) {
                        const { hasActiveSubscription, subscription } = response.data;

                        console.log('✅ API Response Analysis:');
                        console.log(`   Has Active Subscription: ${hasActiveSubscription ? 'YES ✓' : 'NO ✗'}`);

                        if (subscription) {
                            console.log(`   Subscription ID: ${subscription.id}`);
                            console.log(`   Status: ${subscription.status}`);
                            console.log(`   Plan Type: ${subscription.planType}`);
                            console.log(`   In Trial: ${subscription.inTrialPeriod ? 'YES' : 'NO'}`);
                            console.log(`   Trial End: ${subscription.trialEindDatum}`);
                        } else {
                            console.log('   No subscription data returned');
                        }

                        console.log('\n');

                        if (hasActiveSubscription) {
                            console.log('🎉 SUCCESS: User has active subscription!');
                        } else {
                            console.log('❌ PROBLEM: API says no active subscription!');
                            console.log('   This is why the frontend blocks access.');
                        }
                    } else {
                        console.log('❌ API returned error or unexpected format');
                    }

                    resolve(response);
                } catch (error) {
                    console.error('❌ Failed to parse response:', error.message);
                    console.log('Raw response:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error.message);
            reject(error);
        });

        req.end();
    });
}

const userId = process.argv[2] || 3; // Default to user 3
testAPI(userId);
