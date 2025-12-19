import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * POST /api/dossiers/{dossierId}/berichten/{berichtId}/gelezen
 *
 * Marks a bericht as read.
 * Accessible by: Owner, Shared users, Guests
 */
export async function markeerGelezen(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Markeer Gelezen endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        const berichtId = parseInt(request.params.berichtId as string);

        if (isNaN(dossierId) || isNaN(berichtId)) {
            return createErrorResponse('Ongeldig dossier of bericht ID', 400);
        }

        // Authorization
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        const repository = new BerichtenRepository();
        await repository.markeerGelezen(berichtId, access.userId, access.gastId);

        context.log(`Marked bericht ${berichtId} as read`);
        return createSuccessResponse({ marked: true });
    } catch (error) {
        context.error('Error marking bericht as read:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij markeren als gelezen',
            500
        );
    }
}

app.http('markeerGelezen', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/berichten/{berichtId}/gelezen',
    handler: markeerGelezen,
});
