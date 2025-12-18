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
} from '../../utils/response-helper';
import { validateCreateGuestInvitation } from '../../validators/document-portal-validator';

/**
 * POST /api/dossiers/{dossierId}/gasten
 *
 * Creates a new guest invitation for a dossier.
 * Sends invitation email with secure access link.
 *
 * OWNER ONLY: Only the dossier owner can invite guests.
 *
 * Request body:
 * - email: Guest email address (required)
 * - naam: Guest name (optional)
 * - rechten: 'upload', 'view', or 'upload_view' (default: 'upload_view')
 * - verlooptOpDagen: Number of days until token expires (default: 30, max: 365)
 */
export async function inviteGuest(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Invite Guest endpoint called');

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
            return createErrorResponse('Only the dossier owner can invite guests', 403);
        }

        // Parse and validate request body
        const body = await request.json() as any;
        const { error, value } = validateCreateGuestInvitation({
            ...body,
            dossierId,
        });

        if (error) {
            return createErrorResponse(
                `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        const gastRepo = new DossierGastRepository();

        // Check if guest with this email already exists for this dossier
        const existingGuest = await gastRepo.existsByEmail(dossierId, value.email);
        if (existingGuest) {
            return createErrorResponse(
                'A guest with this email already exists for this dossier. Use regenerate token to resend invitation.',
                409
            );
        }

        // Calculate expiry date
        const expiryDays = value.verlooptOpDagen || 30;
        const tokenVerlooptOp = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

        // Create guest invitation
        const { gast, plainToken } = await gastRepo.createWithToken(
            {
                dossierId,
                email: value.email,
                naam: value.naam,
                rechten: value.rechten || 'upload_view',
                tokenVerlooptOp,
            },
            userId
        );

        // Log invitation
        const auditRepo = new DocumentAuditLogRepository();
        await auditRepo.logGuestInvited(
            dossierId,
            userId,
            gast.id,
            extractClientIp(request),
            {
                email: value.email,
                rechten: gast.rechten,
                expiryDays,
            }
        );

        // Build the access URL
        // In production, this should be the frontend URL for the guest portal
        const baseUrl = process.env.GUEST_PORTAL_URL || process.env.FRONTEND_URL || 'https://i-docx.nl';
        const accessUrl = `${baseUrl}/documenten/toegang?token=${plainToken}`;

        // Return the guest info and access URL
        // The plainToken is returned ONLY during creation and should be sent via email
        return createSuccessResponse(
            {
                id: gast.id,
                email: gast.email,
                naam: gast.naam,
                rechten: gast.rechten,
                tokenVerlooptOp: gast.tokenVerlooptOp,
                aangemaaktOp: gast.aangemaaktOp,
                accessUrl,
                // Note: plainToken is included here so the frontend can display/copy it
                // In a production system, you might want to send it only via email
                plainToken,
            },
            201
        );
    } catch (error) {
        context.error('Error inviting guest:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to invite guest',
            500
        );
    }
}

app.http('inviteGuest', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/gasten',
    handler: inviteGuest,
});
