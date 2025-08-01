import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';
import { validateOmgangWeek } from '../../validators/omgang-validator';
import { OmgangWeekDto } from '../../models/Dossier';

export async function upsertOmgangWeek(
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

        const requestBody = await request.json() as any;
        const { error, value } = validateOmgangWeek(requestBody);
        if (error) {
            return createErrorResponse(
                `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        await dbService.initialize();

        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        const upsertedOmgangs = await dbService.upsertOmgangWeek(
            dossierId, 
            value.weekRegelingId, 
            value.days,
            value.weekRegelingAnders
        );

        context.log(`Upserted ${upsertedOmgangs.length} omgang entries for dossier ${dossierId}, week ${value.weekRegelingId}`);
        return createSuccessResponse(upsertedOmgangs, 200);

    } catch (error) {
        context.error('Error in upsertOmgangWeek:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('upsertOmgangWeek', {
    methods: ['POST', 'PUT'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang/week',
    handler: upsertOmgangWeek,
});