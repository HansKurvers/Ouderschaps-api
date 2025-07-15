import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse
} from '../../utils/response-helper';
import Joi from 'joi';

const paramsSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required(),
});

const bodySchema = Joi.object({
    status: Joi.boolean().required(),
});

export async function updateDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Dossier endpoint called');

    // Validate parameters
    const dossierId = parseInt(request.params?.dossierId || '0');
    const { error: paramsError } = paramsSchema.validate({ dossierId });

    if (paramsError) {
        return createErrorResponse('Invalid parameters: ' + paramsError.details.map(d => d.message).join(', '), 400);
    }

    // Parse and validate body
    let body: any;
    try {
        const bodyText = await request.text();
        body = JSON.parse(bodyText);
    } catch (error) {
        return createErrorResponse('Invalid JSON body', 400);
    }

    const { error: bodyError, value } = bodySchema.validate(body);
    if (bodyError) {
        return createErrorResponse('Invalid body: ' + bodyError.details.map(d => d.message).join(', '), 400);
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

        // Update dossier status
        const updatedDossier = await service.updateDossierStatus(dossierId, value.status);

        return createSuccessResponse(updatedDossier);
    } catch (error) {
        context.error('Error updating dossier:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to update dossier',
            500
        );
    } finally {
        await service.close();
    }
}

app.http('updateDossier', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}',
    handler: updateDossier,
});