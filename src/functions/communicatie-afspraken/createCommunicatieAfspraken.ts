import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CommunicatieAfsprakenService } from '../../services/communicatie-afspraken-service';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { CreateCommunicatieAfsprakenDto } from '../../models/CommunicatieAfspraken';

export async function createCommunicatieAfspraken(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Create Communicatie Afspraken endpoint called');

    const service = new CommunicatieAfsprakenService();
    const dossierService = new DossierDatabaseService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await dossierService.initialize();

        // Parse request body
        const body = await request.json() as CreateCommunicatieAfsprakenDto;

        // Validate dossierId
        if (!body.dossierId) {
            return createErrorResponse('dossierId is required', 400);
        }

        // Check if user has access to this dossier
        const hasAccess = await dossierService.checkDossierAccess(body.dossierId, userID);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        // Check if communicatie afspraken already exists for this dossier
        const existing = await service.getByDossierId(body.dossierId);
        if (existing) {
            return createErrorResponse('Communicatie afspraken already exists for this dossier. Use PUT to update.', 409);
        }

        // Create communicatie afspraken
        const afspraken = await service.create(body);

        return createSuccessResponse(afspraken, 201);
    } catch (error) {
        context.error('Error creating communicatie afspraken:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to create communicatie afspraken',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('createCommunicatieAfspraken', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'communicatie-afspraken',
    handler: createCommunicatieAfspraken,
});
