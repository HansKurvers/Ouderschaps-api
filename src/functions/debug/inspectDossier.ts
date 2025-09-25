import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import Joi from 'joi';

const paramsSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required(),
});

export async function inspectDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DEBUG Inspect Dossier endpoint called');

    const dossierId = parseInt(request.params?.dossierId || '0');
    const { error } = paramsSchema.validate({ dossierId });

    if (error) {
        return createErrorResponse('Invalid parameters: ' + error.details.map(d => d.message).join(', '), 400);
    }

    const service = new DossierDatabaseService();

    try {
        await service.initialize();

        const inspectionResults = await service.inspectDossierRelations(dossierId);

        if (!inspectionResults.dossier?.exists) {
            return createSuccessResponse({
                message: 'Dossier does not exist',
                inspection: inspectionResults
            });
        }

        return createSuccessResponse({
            message: `Inspection complete for dossier ${dossierId}`,
            inspection: inspectionResults
        });

    } catch (error) {
        context.error('Error inspecting dossier:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to inspect dossier',
            500
        );
    } finally {
        await service.close();
    }
}

app.http('inspectDossier', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'debug/dossiers/{dossierId}/inspect',
    handler: inspectDossier,
});