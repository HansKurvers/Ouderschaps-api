import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../services/database-service';
import { requireAuthentication } from '../utils/auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse
} from '../utils/response-helper';
import Joi from 'joi';

const paramsSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required(),
});

export async function deleteDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Dossier endpoint called');

    // Validate parameters
    const dossierId = parseInt(request.params?.dossierId || '0');
    const { error } = paramsSchema.validate({ dossierId });

    if (error) {
        return createErrorResponse('Invalid parameters: ' + error.details.map(d => d.message).join(', '), 400);
    }

    const service = new DossierDatabaseService();

    try {
        // Check authentication
        let userID: string;
        try {
            userID = requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await service.initialize();

        const userIDNumber = parseInt(userID);

        // Check access
        const hasAccess = await service.checkDossierAccess(dossierId, userIDNumber);
        if (!hasAccess) {
            return createForbiddenResponse();
        }

        // Delete dossier
        await service.deleteDossier(dossierId);

        return createSuccessResponse({ message: 'Dossier deleted successfully' });
    } catch (error) {
        context.error('Error deleting dossier:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to delete dossier',
            500
        );
    } finally {
        await service.close();
    }
}

app.http('deleteDossier', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}',
    handler: deleteDossier,
});