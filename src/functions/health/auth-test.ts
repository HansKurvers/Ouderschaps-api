import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAuthService } from '../../services/auth';
import { DatabaseService } from '../../services/database.service';

export async function authTest(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('Auth test endpoint called');

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
        return {
            status: 400,
            body: JSON.stringify({
                error: 'No Authorization header provided',
                help: 'Send a request with Authorization: Bearer <token>'
            }, null, 2),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    const results: any = {
        steps: [],
        error: null,
        success: false
    };

    try {
        // Step 1: Get auth service
        const authService = getAuthService();
        results.steps.push({ step: 'Auth service created', success: true });

        // Step 2: Authenticate the request
        context.log('Attempting to authenticate request...');
        const authResult = await authService.authenticateRequest(request);
        
        results.steps.push({ 
            step: 'Authentication attempted',
            result: {
                authenticated: authResult.authenticated,
                userId: authResult.userId,
                auth0Id: authResult.auth0Id,
                error: authResult.error,
                development: authResult.development
            }
        });

        if (!authResult.authenticated) {
            results.error = `Authentication failed: ${authResult.error}`;
            return {
                status: 401,
                body: JSON.stringify(results, null, 2),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        // Step 3: Test database connection
        const db = new DatabaseService();
        try {
            await db.initialize();
            results.steps.push({ step: 'Database connected', success: true });
            
            // Try to fetch the user from database
            const userQuery = await db.executeQuery(
                `SELECT id, auth0_id, email, naam 
                 FROM dbo.gebruikers 
                 WHERE auth0_id = @auth0Id`,
                {
                    auth0Id: { value: authResult.auth0Id, type: require('mssql').NVarChar }
                }
            );
            
            results.steps.push({ 
                step: 'User lookup',
                found: userQuery.recordset.length > 0,
                user: userQuery.recordset[0] || null
            });

            await db.close();
        } catch (dbError) {
            results.steps.push({ 
                step: 'Database operation failed',
                error: dbError instanceof Error ? dbError.message : 'Unknown error'
            });
        }

        results.success = true;
        return {
            status: 200,
            body: JSON.stringify(results, null, 2),
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (error) {
        context.error('Error in auth test:', error);
        results.error = error instanceof Error ? error.message : 'Unknown error';
        results.errorStack = error instanceof Error ? error.stack : undefined;
        
        return {
            status: 500,
            body: JSON.stringify(results, null, 2),
            headers: { 'Content-Type': 'application/json' }
        };
    }
}

app.http('authTest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'health/auth-test',
    handler: authTest,
});