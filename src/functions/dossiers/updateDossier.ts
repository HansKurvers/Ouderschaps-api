import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { DossierRepository } from '../../repositories/DossierRepository';
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
    status: Joi.boolean().optional(),
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
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await service.initialize();

        // Check access (owner or shared user)
        const hasAccess = await service.checkDossierAccess(dossierId, userID);
        if (!hasAccess) {
            return createForbiddenResponse();
        }

        // Update dossier if status is provided
        if (value.status !== undefined) {
            // Status changes require ownership
            const repository = new DossierRepository();
            const isOwner = await repository.isOwner(dossierId, userID);
            if (!isOwner) {
                return createErrorResponse('Alleen de eigenaar kan de status wijzigen', 403);
            }

            const updatedDossier = await service.updateDossierStatus(dossierId, value.status);
            return createSuccessResponse(updatedDossier);
        } else {
            // If no status provided, just return the current dossier
            const dossier = await service.getDossierById(dossierId);
            return createSuccessResponse(dossier);
        }
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