import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function envCheck(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('Environment check endpoint called');

    // Only show safe environment info
    const envInfo = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        SKIP_AUTH: process.env.SKIP_AUTH || 'not set',
        AUTH0_DOMAIN_SET: !!process.env.AUTH0_DOMAIN && process.env.AUTH0_DOMAIN !== 'your-actual-domain.auth0.com',
        AUTH0_AUDIENCE_SET: !!process.env.AUTH0_AUDIENCE,
        AUTH0_ISSUER_SET: !!process.env.AUTH0_ISSUER,
        DEV_USER_ID: process.env.DEV_USER_ID || 'not set',
        // Show first few chars of Auth0 domain to verify it's set correctly
        AUTH0_DOMAIN_PREFIX: process.env.AUTH0_DOMAIN ? process.env.AUTH0_DOMAIN.substring(0, 10) + '...' : 'not set',
        // Check if running in Azure
        WEBSITE_INSTANCE_ID: process.env.WEBSITE_INSTANCE_ID ? 'Running in Azure' : 'Not in Azure',
        FUNCTIONS_WORKER_RUNTIME: process.env.FUNCTIONS_WORKER_RUNTIME || 'not set',
    };

    return {
        status: 200,
        body: JSON.stringify({
            status: 'ok',
            environment: envInfo,
            timestamp: new Date().toISOString()
        }, null, 2),
        headers: {
            'Content-Type': 'application/json'
        }
    };
}

app.http('envCheck', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health/env-check',
    handler: envCheck,
});