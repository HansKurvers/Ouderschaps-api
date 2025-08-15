import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import { validateCreateZorg } from '../../validators/zorg-validator';
import { CreateZorgDto } from '../../models/Dossier';

export async function createZorg(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        const userId = await requireAuthentication(request);
        if (userId === null) {
            return createErrorResponse('User ID is required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        const requestBody = await request.json() as any;
        const { error, value } = validateCreateZorg(requestBody);
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

        const createData: CreateZorgDto & { aangemaaktDoor: number } = {
            dossierId,
            aangemaaktDoor: userId,
            ...value
        };

        const newZorg = await dbService.createZorg(createData);

        context.log(`Created zorg with ID ${newZorg.id} for dossier ${dossierId}`);
        return createSuccessResponse(newZorg, 201);

    } catch (error) {
        context.error('Error in createZorg:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('createZorg', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/zorg',
    handler: createZorg,
});
