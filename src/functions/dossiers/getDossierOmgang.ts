import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getDossierOmgang(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        try {
            await dbService.initialize();
            context.log('Database connection initialized successfully');
        } catch (dbError) {
            context.error('Database initialization failed in getDossierOmgang:', dbError);
            return createErrorResponse('Database connection failed', 500);
        }

        context.log(`Checking access for user ${userId} to dossier ${dossierId}`);
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        context.log(`Dossier access check result: ${hasAccess}`);
        if (!hasAccess) {
            context.warn(`Access denied for user ${userId} to dossier ${dossierId}`);
            return createErrorResponse('Access denied to this dossier', 403);
        }

        const omgang = await dbService.getOmgangByDossier(dossierId);

        context.log(`Retrieved ${omgang.length} omgang entries for dossier ${dossierId}`);
        return createSuccessResponse(omgang);

    } catch (error) {
        context.error('Error in getDossierOmgang:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getDossierOmgang', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang',
    handler: getDossierOmgang,
});