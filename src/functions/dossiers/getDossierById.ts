import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
    createNotFoundResponse,
    createForbiddenResponse
} from '../../utils/response-helper';
import Joi from 'joi';

const paramsSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required(),
});

export async function getDossierById(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Dossier by ID endpoint called');

    // Validate parameters
    const dossierId = parseInt(request.params?.dossierId || '0');
    const { error } = paramsSchema.validate({ dossierId });

    if (error) {
        return createErrorResponse('Invalid parameters: ' + error.details.map(d => d.message).join(', '), 400);
    }

    const service = new DossierDatabaseService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await service.initialize();

        // Check access
        const hasAccess = await service.checkDossierAccess(dossierId, userID);

        // Get complete dossier data
        const dossier = await service.getCompleteDossierData(dossierId);

        // Check if dossier exists
        if (!dossier) {
            return createNotFoundResponse('Dossier');
        }

        // Check if user has access
        if (!hasAccess) {
            return createForbiddenResponse();
        }

        // Add isOwner flag to dossier
        const isOwner = dossier.dossier.gebruikerId === userID;
        const responseData = {
            ...dossier,
            dossier: {
                ...dossier.dossier,
                isOwner,
            },
        };

        return createSuccessResponse(responseData);
    } catch (error) {
        context.error('Error fetching dossier:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to fetch dossier',
            500
        );
    } finally {
        await service.close();
    }
}

app.http('getDossierById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}',
    handler: getDossierById,
});