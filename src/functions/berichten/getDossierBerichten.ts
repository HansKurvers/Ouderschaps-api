import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * GET /api/dossiers/{dossierId}/berichten
 *
 * Returns all berichten for a dossier with reactions, attachments, and read status.
 * Accessible by: Owner, Shared users, Guests
 */
export async function getDossierBerichten(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Dossier Berichten endpoint called');

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
        const overzicht = await repository.getBerichten(
            dossierId,
            access.userId,
            access.gastId
        );

        context.log(`Found ${overzicht.totaal} berichten for dossier ${dossierId}, ${overzicht.ongelezen} unread`);
        return createSuccessResponse(overzicht);
    } catch (error) {
        context.error('Error fetching dossier berichten:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij ophalen berichten',
            500
        );
    }
}

app.http('getDossierBerichten', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/berichten',
    handler: getDossierBerichten,
});
