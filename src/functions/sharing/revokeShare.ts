import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createForbiddenResponse, createNotFoundResponse } from '../../utils/response-helper';
import { GedeeldeDossierRepository } from '../../repositories/GedeeldeDossierRepository';

/**
 * DELETE /api/dossiers/{id}/delen/{gebruikerId}
 * Revoke a user's access to a dossier
 *
 * Only the owner can revoke access
 */
export async function revokeShare(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        // Auth
        const userId = await requireAuthentication(request);

        // Validate IDs
        const dossierId = parseInt(request.params.id || '');
        const targetGebruikerId = parseInt(request.params.gebruikerId || '');

        if (isNaN(dossierId) || isNaN(targetGebruikerId)) {
            return createErrorResponse('Ongeldige ID waarden', 400);
        }

        // Check ownership
        const repo = new GedeeldeDossierRepository();
        const isOwner = await repo.isOwner(dossierId, userId);
        if (!isOwner) {
            return createForbiddenResponse();
        }

        // Revoke access
        const deleted = await repo.delete(dossierId, targetGebruikerId);

        if (!deleted) {
            return createNotFoundResponse('Share niet gevonden');
        }

        return createSuccessResponse({ message: 'Toegang ingetrokken' }, 200);

    } catch (error) {
        context.error('Error revoking share:', error);
        return error instanceof Error && error.message.includes('Unauthorized')
            ? createUnauthorizedResponse()
            : createErrorResponse('Fout bij intrekken toegang', 500);
    }
}

app.http('revokeShare', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{id}/delen/{gebruikerId}',
    handler: revokeShare
});
