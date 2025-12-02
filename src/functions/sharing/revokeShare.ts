import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createForbiddenResponse, createNotFoundResponse } from '../../utils/response-helper';
import { GedeeldeDossierRepository } from '../../repositories/GedeeldeDossierRepository';
// import { EmailService } from '../../services/email.service';
import { getPool } from '../../config/database';

/**
 * Helper to get user info by ID
 */
async function getUserById(userId: number): Promise<{ naam: string | null; email: string | null } | null> {
    const pool = await getPool();
    const result = await pool.request()
        .input('userId', userId)
        .query('SELECT naam, email FROM dbo.gebruikers WHERE id = @userId');
    return result.recordset[0] || null;
}

/**
 * DELETE /api/dossiers/{id}/delen/{gebruikerId}
 * Revoke a user's access to a dossier
 *
 * Only the owner can revoke access
 */
export async function revokeShare(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        // Auth
        const userId = await requireAuthentication(request);

        // Validate IDs
        const dossierId = parseInt(request.params.id || '');
        const targetGebruikerId = parseInt(request.params.gebruikerId || '');

        if (isNaN(dossierId) || isNaN(targetGebruikerId)) {
            return createErrorResponse('Ongeldige ID waarden', 400);
        }

        // Check ownership
        const repo = new GedeeldeDossierRepository();
        const isOwner = await repo.isOwner(dossierId, userId);
        if (!isOwner) {
            return createForbiddenResponse();
        }

        // Get target user info BEFORE deleting (for email notification)
        const targetUser = await getUserById(targetGebruikerId);

        // Revoke access
        const deleted = await repo.delete(dossierId, targetGebruikerId);

        if (!deleted) {
            return createNotFoundResponse('Share niet gevonden');
        }

        // Send email notification (non-blocking - soft fail)
        if (targetUser?.email) {
            // TEMPORARILY DISABLED - Email causing deployment issues
            /*
            try {
                const ownerInfo = await getUserById(userId);
                const emailService = new EmailService();
                await emailService.sendDossierAccessRevokedEmail({
                    toEmail: targetUser.email,
                    revokedByName: ownerInfo?.naam || ownerInfo?.email || 'Onbekend'
                });
                context.log(`[RevokeShare] Email notification sent to: ${targetUser.email}`);
            } catch (err) {
                // Soft fail - log but don't block the operation
                context.warn('[RevokeShare] Email notification failed (non-blocking):', err);
            }
            */
        }

        return createSuccessResponse({ message: 'Toegang ingetrokken' }, 200);

    } catch (error) {
        context.error('Error revoking share:', error);
        return error instanceof Error && error.message.includes('Unauthorized')
            ? createUnauthorizedResponse()
            : createErrorResponse('Fout bij intrekken toegang', 500);
    }
}

app.http('revokeShare', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{id}/delen/{gebruikerId}',
    handler: revokeShare
});
