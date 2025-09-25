import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getDossierPartijen(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Initialize database
        try {
            await dbService.initialize();
            context.log('Database connection initialized successfully');
        } catch (dbError) {
            context.error('Database initialization failed in getDossierPartijen:', dbError);
            return createErrorResponse('Database connection failed', 500);
        }

        // Check dossier access
        context.log(`Checking access for user ${userId} to dossier ${dossierId}`);
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        context.log(`Dossier access check result: ${hasAccess}`);
        if (!hasAccess) {
            context.warn(`Access denied for user ${userId} to dossier ${dossierId}`);
            return createErrorResponse('Access denied', 403);
        }

        // Get partijen with IDs
        const partijen = await dbService.getPartijListWithId(dossierId);

        context.log(`Retrieved ${partijen.length} partijen for dossier ${dossierId}`);
        return createSuccessResponse(partijen);

    } catch (error) {
        context.error('Error in getDossierPartijen:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getDossierPartijen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/partijen',
    handler: getDossierPartijen,
});