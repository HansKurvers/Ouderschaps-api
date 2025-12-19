import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * POST /api/dossiers/{dossierId}/berichten/alles-gelezen
 *
 * Marks all berichten in a dossier as read.
 * Accessible by: Owner, Shared users, Guests
 */
export async function markeerAllesGelezen(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Markeer Alles Gelezen endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);

        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }

        // Authorization
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        const repository = new BerichtenRepository();
        await repository.markeerAlleGelezen(dossierId, access.userId, access.gastId);

        context.log(`Marked all berichten in dossier ${dossierId} as read`);
        return createSuccessResponse({ marked: true });
    } catch (error) {
        context.error('Error marking all berichten as read:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij markeren als gelezen',
            500
        );
    }
}

app.http('markeerAllesGelezen', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/berichten/alles-gelezen',
    handler: markeerAllesGelezen,
});
