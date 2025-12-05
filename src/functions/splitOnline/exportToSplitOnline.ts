/**
 * Export Dossier to Split-Online Azure Function
 * POST /api/dossiers/{dossierId}/split-online/export
 *
 * Exports dossier data (partijen and kinderen) to Split-Online
 * for alimentatie calculations using the AFD format.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from '../../utils/response-helper';
import { SplitOnlineService } from '../../services/splitOnline.service';
import Joi from 'joi';

// Validate dossierId parameter
const paramsSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required(),
});

export async function exportToSplitOnline(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('[SplitOnline Export] Endpoint called');

    try {
        // 1. Authenticate user
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch {
            return createUnauthorizedResponse();
        }

        // 2. Validate dossierId parameter
        const dossierId = parseInt(request.params?.dossierId || '0');
        const { error } = paramsSchema.validate({ dossierId });

        if (error) {
            return createErrorResponse(
                'Ongeldige parameters: ' + error.details.map(d => d.message).join(', '),
                400
            );
        }

        context.log(`[SplitOnline Export] User ${userId} exporting dossier ${dossierId}`);

        // 3. Export dossier using the service
        const service = new SplitOnlineService();
        const result = await service.exportDossier(dossierId, userId);

        // 4. Return appropriate response
        if (result.success) {
            context.log(`[SplitOnline Export] Success - Dossier ${dossierId} exported to ${result.url}`);

            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    success: true,
                    splitOnlineUrl: result.url,
                    splitOnlineDossierId: result.dossierId,
                    message: 'Dossier succesvol geëxporteerd naar Split-Online',
                }),
            };
        }

        // Handle specific error cases
        context.error(`[SplitOnline Export] Failed - ${result.error}: ${result.details}`);

        // Return appropriate status code based on the error
        const statusCode = result.statusCode || 500;

        // Map to response helpers where appropriate
        if (statusCode === 403) {
            return createForbiddenResponse();
        }

        return {
            status: statusCode,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: false,
                error: result.error,
                details: result.details,
            }),
        };

    } catch (error) {
        context.error('[SplitOnline Export] Unexpected error:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Onbekende fout bij exporteren naar Split-Online',
            500
        );
    }
}

// Register Azure Function
app.http('exportToSplitOnline', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/split-online/export',
    handler: exportToSplitOnline,
});
