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
import { validateRegenerateToken } from '../../validators/document-portal-validator';

/**
 * POST /api/dossiers/{dossierId}/gasten/{gastId}/regenerate-token
 *
 * Regenerates a guest's access token.
 * Useful for:
 * - Extending expired access
 * - Resending invitation with new link
 * - Invalidating previous token for security
 *
 * OWNER ONLY: Only the dossier owner can regenerate tokens.
 *
 * Request body (optional):
 * - verlooptOpDagen: Number of days until new token expires (default: 30, max: 365)
 */
export async function regenerateGuestToken(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Regenerate Guest Token endpoint called');

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
            return createErrorResponse('Only the dossier owner can regenerate guest tokens', 403);
        }

        const gastRepo = new DossierGastRepository();

        // Verify guest belongs to this dossier
        const guestBelongsToDossier = await gastRepo.belongsToDossier(gastId, dossierId);
        if (!guestBelongsToDossier) {
            return createNotFoundResponse('Guest');
        }

        // Parse and validate optional body
        let expiryDays = 30; // Default
        try {
            const body = await request.json() as any;
            if (body) {
                const { error, value } = validateRegenerateToken(body);
                if (error) {
                    return createErrorResponse(
                        `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                        400
                    );
                }
                if (value.verlooptOpDagen) {
                    expiryDays = value.verlooptOpDagen;
                }
            }
        } catch {
            // Body is optional, continue with defaults
        }

        // Regenerate token
        const { gast, plainToken } = await gastRepo.regenerateToken(gastId, expiryDays);

        // Log token regeneration
        const auditRepo = new DocumentAuditLogRepository();
        await auditRepo.log({
            dossierId,
            gebruikerId: userId,
            gastId,
            ipAdres: extractClientIp(request),
            actie: 'guest_invited', // Reuse guest_invited since it's effectively a new invitation
            details: {
                action: 'token_regenerated',
                email: gast.email,
                expiryDays,
            },
        });

        // Build the access URL
        const baseUrl = process.env.GUEST_PORTAL_URL || process.env.FRONTEND_URL || 'https://i-docx.nl';
        const accessUrl = `${baseUrl}/documenten/toegang?token=${plainToken}`;

        return createSuccessResponse({
            id: gast.id,
            email: gast.email,
            naam: gast.naam,
            rechten: gast.rechten,
            tokenVerlooptOp: gast.tokenVerlooptOp,
            accessUrl,
            plainToken,
        });
    } catch (error) {
        context.error('Error regenerating guest token:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to regenerate guest token',
            500
        );
    }
}

app.http('regenerateGuestToken', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/gasten/{gastId}/regenerate-token',
    handler: regenerateGuestToken,
});
