import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { GedeeldeDossierRepository } from '../../repositories/GedeeldeDossierRepository';

/**
 * GET /api/dossiers/gedeeld-met-mij
 * Get all dossiers that are shared with the current user
 *
 * Returns list of dossiers with owner info
 */
export async function getSharedWithMe(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        // Auth
        const userId = await requireAuthentication(request);

        // Get shared dossiers
        const repo = new GedeeldeDossierRepository();
        const dossiers = await repo.findSharedWithUser(userId);

        return createSuccessResponse(dossiers, 200);

    } catch (error) {
        context.error('Error getting shared dossiers:', error);
        return error instanceof Error && error.message.includes('Unauthorized')
            ? createUnauthorizedResponse()
            : createErrorResponse('Fout bij ophalen gedeelde dossiers', 500);
    }
}

app.http('getSharedWithMe', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'gedeeld',
    handler: getSharedWithMe
});
