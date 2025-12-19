import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * POST /api/dossiers/{dossierId}/berichten/{berichtId}/vastpinnen
 *
 * Toggles the pinned status of a bericht.
 * Only accessible by: Owner
 */
export async function toggleVastpinnen(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Toggle Vastpinnen endpoint called');

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

        // Only owner can pin berichten
        if (access.type !== 'owner') {
            return createErrorResponse('Alleen de eigenaar kan berichten vastpinnen', 403);
        }

        const repository = new BerichtenRepository();
        await repository.toggleVastpinnen(berichtId);

        context.log(`Toggled vastpinnen for bericht ${berichtId}`);
        return createSuccessResponse({ toggled: true });
    } catch (error) {
        context.error('Error toggling vastpinnen:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij vastpinnen',
            500
        );
    }
}

app.http('toggleVastpinnen', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/berichten/{berichtId}/vastpinnen',
    handler: toggleVastpinnen,
});
