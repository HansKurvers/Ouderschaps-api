import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierGastRepository } from '../../repositories/DossierGastRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { DocumentAuditLogRepository } from '../../repositories/DocumentAuditLogRepository';
import { requireAuthentication } from '../../utils/auth-helper';
import { extractClientIp } from '../../utils/guest-auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
    createNotFoundResponse,
} from '../../utils/response-helper';

/**
 * DELETE /api/dossiers/{dossierId}/gasten/{gastId}
 *
 * Revokes a guest's access to a dossier.
 * The guest record is kept for audit trail but marked as revoked.
 *
 * OWNER ONLY: Only the dossier owner can revoke guest access.
 */
export async function revokeGuest(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Revoke Guest endpoint called');

    try {
        // Parse route parameters
        const dossierId = parseInt(request.params.dossierId as string);
        const gastId = parseInt(request.params.gastId as string);

        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        if (isNaN(gastId)) {
            return createErrorResponse('Invalid guest ID', 400);
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
            return createErrorResponse('Only the dossier owner can revoke guest access', 403);
        }

        const gastRepo = new DossierGastRepository();

        // Verify guest belongs to this dossier
        const guestBelongsToDossier = await gastRepo.belongsToDossier(gastId, dossierId);
        if (!guestBelongsToDossier) {
            return createNotFoundResponse('Guest');
        }

        // Get guest info for audit log
        const guest = await gastRepo.findById(gastId);
        if (!guest) {
            return createNotFoundResponse('Guest');
        }

        // Check if already revoked
        if (guest.ingetrokken) {
            return createErrorResponse('Guest access is already revoked', 400);
        }

        // Revoke the guest
        const revoked = await gastRepo.revoke(gastId);

        if (!revoked) {
            return createErrorResponse('Failed to revoke guest access', 500);
        }

        // Log revocation
        const auditRepo = new DocumentAuditLogRepository();
        await auditRepo.logGuestRevoked(
            dossierId,
            userId,
            gastId,
            extractClientIp(request),
            {
                email: guest.email,
                naam: guest.naam,
            }
        );

        return createSuccessResponse({
            message: 'Guest access successfully revoked',
            gastId,
            email: guest.email,
        });
    } catch (error) {
        context.error('Error revoking guest:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to revoke guest access',
            500
        );
    }
}

app.http('revokeGuest', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/gasten/{gastId}',
    handler: revokeGuest,
});
