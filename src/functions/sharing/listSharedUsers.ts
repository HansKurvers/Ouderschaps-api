import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createForbiddenResponse } from '../../utils/response-helper';
import { GedeeldeDossierRepository } from '../../repositories/GedeeldeDossierRepository';

/**
 * GET /api/dossiers/{id}/gedeeld
 * Get all users this dossier is shared with
 *
 * Only the owner can see who the dossier is shared with
 */
export async function listSharedUsers(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        // Auth
        const userId = await requireAuthentication(request);

        // Validate dossier ID
        const dossierId = parseInt(request.params.id || '');
        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }

        // Check ownership
        const repo = new GedeeldeDossierRepository();
        const isOwner = await repo.isOwner(dossierId, userId);
        if (!isOwner) {
            return createForbiddenResponse();
        }

        // Get shared users
        const users = await repo.findUsersSharedWith(dossierId);

        return createSuccessResponse(users, 200);

    } catch (error) {
        context.error('Error listing shared users:', error);
        return error instanceof Error && error.message.includes('Unauthorized')
            ? createUnauthorizedResponse()
            : createErrorResponse('Fout bij ophalen gedeelde gebruikers', 500);
    }
}

app.http('listSharedUsers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{id}/gedeeld',
    handler: listSharedUsers
});
