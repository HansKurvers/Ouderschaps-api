import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { auth0Config, validateAuth0Config } from '../../config/auth0.config';
import { getAuthService } from '../../services/auth';

export async function authCheck(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('Auth check endpoint called');

    try {
        // Check configuration
        validateAuth0Config();
        
        const config = {
            skipAuth: auth0Config.skipAuth,
            hasAuth0Domain: !!auth0Config.domain && auth0Config.domain !== 'your-actual-domain.auth0.com',
            hasAuth0Audience: !!auth0Config.audience,
            hasAuth0Issuer: !!auth0Config.issuer,
            auth0Domain: auth0Config.domain ? auth0Config.domain.substring(0, 10) + '...' : 'not set',
            auth0Audience: auth0Config.audience || 'not set',
            nodeEnv: process.env.NODE_ENV,
            skipAuthEnv: process.env.SKIP_AUTH
        };

        // Try to parse authorization header if provided
        let authHeaderInfo = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            authHeaderInfo = {
                present: true,
                startsWithBearer: authHeader.startsWith('Bearer '),
                length: authHeader.length
            };

            // Try to authenticate
            const authService = getAuthService();
            const result = await authService.authenticateRequest(request);
            authHeaderInfo = {
                ...authHeaderInfo,
                authResult: {
                    authenticated: result.authenticated,
                    error: result.error,
                    userId: result.userId,
                    auth0Id: result.auth0Id
                }
            };
        }

        return {
            status: 200,
            body: JSON.stringify({
                status: 'ok',
                config,
                authHeaderInfo,
                timestamp: new Date().toISOString()
            }, null, 2),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        context.error('Error in auth check:', error);
        return {
            status: 500,
            body: JSON.stringify({
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
}

app.http('authCheck', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'health/auth-check',
    handler: authCheck,
});