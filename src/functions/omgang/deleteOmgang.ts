import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OmgangRepository } from '../../repositories/OmgangRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function deleteOmgang(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Omgang endpoint called');

    const dossierService = new DossierDatabaseService();
    let omgangRepository: OmgangRepository | undefined;

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await dossierService.initialize();

        // Get omgang ID from route
        const omgangId = parseInt(request.params.omgangId as string);
        if (isNaN(omgangId)) {
            return createErrorResponse('Invalid omgang ID', 400);
        }

        if (USE_REPOSITORY_PATTERN) {
            omgangRepository = new OmgangRepository();

            // Check if omgang exists and get its dossier ID
            const existingOmgang = await omgangRepository.findById(omgangId);
            if (!existingOmgang) {
                return createErrorResponse('Omgang record not found', 404);
            }

            // Check if user has access to the dossier
            const hasAccess = await dossierService.checkDossierAccess(existingOmgang.omgang.dossierId, userID);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // Delete omgang record
            const deleted = await omgangRepository.delete(omgangId);

            if (deleted) {
                return createSuccessResponse({
                    message: 'Omgang record deleted successfully',
                    omgangId
                });
            } else {
                return createErrorResponse('Failed to delete omgang record', 500);
            }
        } else {
            // Legacy path: use database service
            return createErrorResponse('Legacy omgang deletion not implemented', 501);
        }
    } catch (error) {
        context.error('Error deleting omgang:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to delete omgang',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('deleteOmgang', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'omgang/{omgangId}',
    handler: deleteOmgang,
});
