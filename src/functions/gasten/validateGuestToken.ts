import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierRepository } from '../../repositories/DossierRepository';
import { authenticateGuest } from '../../utils/guest-auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
} from '../../utils/response-helper';

/**
 * GET /api/guest/validate
 *
 * Validates a guest token and returns dossier access info.
 * This is the entry point for the guest portal.
 *
 * Token should be provided via:
 * - Query parameter: ?token=<token>
 * - Authorization header: Bearer <token>
 * - X-Guest-Token header
 */
export async function validateGuestToken(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Validate Guest Token endpoint called');

    try {
        // Authenticate guest
        const authResult = await authenticateGuest(request);

        if (!authResult.authenticated || !authResult.gast) {
            return createUnauthorizedResponse();
        }

        const gast = authResult.gast;

        // Get dossier info
        const dossierRepo = new DossierRepository();
        const dossier = await dossierRepo.findById(gast.dossierId);

        if (!dossier) {
            return createErrorResponse('Dossier not found', 404);
        }

        // Return guest info and permissions
        return createSuccessResponse({
            gast: {
                id: gast.id,
                naam: gast.naam,
                email: gast.email,
                rechten: gast.rechten,
                tokenVerlooptOp: gast.tokenVerlooptOp,
            },
            dossier: {
                id: dossier.id,
                dossierNummer: dossier.dossierNummer,
            },
            permissions: {
                canUpload: gast.rechten === 'upload' || gast.rechten === 'upload_view',
                canView: gast.rechten === 'view' || gast.rechten === 'upload_view',
            },
        });
    } catch (error) {
        context.error('Error validating guest token:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to validate guest token',
            500
        );
    }
}

app.http('validateGuestToken', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'guest/validate',
    handler: validateGuestToken,
});
