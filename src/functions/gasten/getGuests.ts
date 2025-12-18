import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierGastRepository } from '../../repositories/DossierGastRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { requireAuthentication } from '../../utils/auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
} from '../../utils/response-helper';

/**
 * GET /api/dossiers/{dossierId}/gasten
 *
 * Returns all guests for a dossier.
 * Shows active and revoked guests.
 *
 * OWNER ONLY: Only the dossier owner can view guests.
 */
export async function getGuests(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Guests endpoint called');

    try {
        // Parse dossier ID from route
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Authenticate user
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // OWNER ONLY: Check if user is the dossier owner
        const dossierRepo = new DossierRepository();
        const isOwner = await dossierRepo.isOwner(dossierId, userId);

        if (!isOwner) {
            return createErrorResponse('Only the dossier owner can view guests', 403);
        }

        // Fetch guests
        const gastRepo = new DossierGastRepository();
        const guests = await gastRepo.findByDossierId(dossierId);

        // Map to safe response (exclude token hash)
        const safeGuests = guests.map(guest => ({
            id: guest.id,
            email: guest.email,
            naam: guest.naam,
            rechten: guest.rechten,
            tokenVerlooptOp: guest.tokenVerlooptOp,
            uitnodigingVerzondenOp: guest.uitnodigingVerzondenOp,
            eersteToegangOp: guest.eersteToegangOp,
            laatsteToegangOp: guest.laatsteToegangOp,
            ingetrokken: guest.ingetrokken,
            ingetrokkenOp: guest.ingetrokkenOp,
            aangemaaktOp: guest.aangemaaktOp,
            isExpired: new Date() > guest.tokenVerlooptOp,
            isActive: !guest.ingetrokken && new Date() <= guest.tokenVerlooptOp,
        }));

        return createSuccessResponse(safeGuests);
    } catch (error) {
        context.error('Error fetching guests:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to fetch guests',
            500
        );
    }
}

app.http('getGuests', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/gasten',
    handler: getGuests,
});
