import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';
import { validateCreateOmgangBatch } from '../../validators/omgang-validator';
import { CreateOmgangBatchDto } from '../../models/Dossier';

export async function createOmgangBatch(
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
        const { error, value } = validateCreateOmgangBatch(requestBody);
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

        const createdOmgangs = await dbService.createOmgangBatch(dossierId, value.entries);

        context.log(`Created ${createdOmgangs.length} omgang entries for dossier ${dossierId}`);
        return createSuccessResponse(createdOmgangs, 201);

    } catch (error) {
        context.error('Error in createOmgangBatch:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('createOmgangBatch', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang/batch',
    handler: createOmgangBatch,
});