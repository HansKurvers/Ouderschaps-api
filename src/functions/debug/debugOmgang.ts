import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function debugOmgang(
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

        await dbService.initialize();
        
        // Check dossier access
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        // Get raw omgang data
        const omgang = await dbService.getOmgangByDossier(dossierId);
        
        // Debug info
        const debugInfo = {
            dossierId,
            totalRecords: omgang.length,
            firstRecord: omgang.length > 0 ? {
                id: omgang[0].id,
                idType: typeof omgang[0].id,
                isArray: Array.isArray(omgang[0].id),
                dagId: omgang[0].dagId,
                dagIdType: typeof omgang[0].dagId,
                dagIdIsArray: Array.isArray(omgang[0].dagId),
                dag: {
                    id: omgang[0].dag?.id,
                    idType: typeof omgang[0].dag?.id,
                    isArray: Array.isArray(omgang[0].dag?.id)
                },
                weekRegelingId: omgang[0].weekRegelingId,
                weekRegelingIdType: typeof omgang[0].weekRegelingId,
                weekRegeling: {
                    id: omgang[0].weekRegeling?.id,
                    idType: typeof omgang[0].weekRegeling?.id,
                    isArray: Array.isArray(omgang[0].weekRegeling?.id)
                }
            } : null,
            sampleData: omgang.slice(0, 3)
        };

        return createSuccessResponse(debugInfo);

    } catch (error) {
        context.error('Error in debugOmgang:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('debugOmgang', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'debug/dossiers/{dossierId}/omgang',
    handler: debugOmgang,
});