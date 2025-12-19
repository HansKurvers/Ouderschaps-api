import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { CreateBerichtRequest } from '../../models/Berichten';

/**
 * POST /api/dossiers/{dossierId}/berichten
 *
 * Creates a new bericht in a dossier.
 * Accessible by: Owner, Shared users, Guests
 */
export async function createDossierBericht(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Dossier Bericht endpoint called');

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

        // Parse and validate body
        const body = await request.json() as CreateBerichtRequest;

        if (!body.onderwerp || !body.inhoud) {
            return createErrorResponse('onderwerp en inhoud zijn verplicht', 400);
        }

        const repository = new BerichtenRepository();
        const bericht = await repository.createBericht(
            dossierId,
            body,
            access.userId,
            access.gastId
        );

        context.log(`Created bericht ${bericht.id} in dossier ${dossierId}`);

        // TODO: Send email notifications asynchronously
        // This would be handled by a background job or queue in production

        return createSuccessResponse(bericht, 201);
    } catch (error) {
        context.error('Error creating dossier bericht:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij versturen bericht',
            500
        );
    }
}

app.http('createDossierBericht', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/berichten',
    handler: createDossierBericht,
});
