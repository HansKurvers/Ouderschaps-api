import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function health(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('Health check endpoint called');

    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'development',
        }),
    };
}

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: health,
});
