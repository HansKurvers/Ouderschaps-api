import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';

export async function getOmgangWeek(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        const userId = getUserId(request);
        if (!userId) {
            return createErrorResponse('User ID is required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        const weekRegelingId = Number(request.params.weekRegelingId);
        if (!weekRegelingId || isNaN(weekRegelingId)) {
            return createErrorResponse('Invalid week regeling ID', 400);
        }

        await dbService.initialize();

        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        const omgangWeekData = await dbService.getOmgangByWeek(dossierId, weekRegelingId);

        context.log(`Retrieved ${omgangWeekData.length} omgang entries for dossier ${dossierId}, week ${weekRegelingId}`);
        return createSuccessResponse(omgangWeekData, 200);

    } catch (error) {
        context.error('Error in getOmgangWeek:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getOmgangWeek', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang/week/{weekRegelingId}',
    handler: getOmgangWeek,
});