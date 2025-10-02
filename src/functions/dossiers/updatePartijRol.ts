import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import Joi from 'joi';

const updatePartijRolSchema = Joi.object({
    rolId: Joi.number().integer().positive().required()
});

export async function updatePartijRol(
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

        // Get dossier ID and partij ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        const partijId = parseInt(request.params.partijId || '');

        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        if (!partijId || isNaN(partijId)) {
            return createErrorResponse('Invalid partij ID', 400);
        }

        // Get request body
        const requestBody = await request.text();
        if (!requestBody) {
            return createErrorResponse('Request body is required', 400);
        }

        let requestData;
        try {
            requestData = JSON.parse(requestBody);
        } catch (error) {
            return createErrorResponse('Invalid JSON in request body', 400);
        }

        // Validate input
        const { error, value } = updatePartijRolSchema.validate(requestData);
        if (error) {
            return createErrorResponse(
                `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        // Initialize database
        await dbService.initialize();

        // Check dossier access
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Update the partij rol
        const updatedPartij = await dbService.updatePartijRol(dossierId, partijId, value.rolId);

        context.log(`Updated partij ${partijId} rol to ${value.rolId} in dossier ${dossierId}`);
        return createSuccessResponse(updatedPartij);

    } catch (error) {
        context.error('Error in updatePartijRol:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('updatePartijRol', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/partijen/{partijId}',
    handler: updatePartijRol,
});
