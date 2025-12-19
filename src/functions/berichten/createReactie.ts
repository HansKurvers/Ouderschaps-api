import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { CreateReactieRequest } from '../../models/Berichten';

/**
 * POST /api/dossiers/{dossierId}/berichten/{berichtId}/reacties
 *
 * Creates a new reactie on a bericht.
 * Accessible by: Owner, Shared users, Guests
 */
export async function createReactie(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Create Reactie endpoint called');

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

        // Parse and validate body
        const body = await request.json() as CreateReactieRequest;

        if (!body.inhoud || body.inhoud.trim().length === 0) {
            return createErrorResponse('inhoud is verplicht', 400);
        }

        const repository = new BerichtenRepository();
        const reactie = await repository.createReactie(
            berichtId,
            body.inhoud.trim(),
            access.userId,
            access.gastId
        );

        context.log(`Created reactie ${reactie.id} on bericht ${berichtId}`);

        // TODO: Send email notification for reactie

        return createSuccessResponse(reactie, 201);
    } catch (error) {
        context.error('Error creating reactie:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij plaatsen reactie',
            500
        );
    }
}

app.http('createReactie', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/berichten/{berichtId}/reacties',
    handler: createReactie,
});
