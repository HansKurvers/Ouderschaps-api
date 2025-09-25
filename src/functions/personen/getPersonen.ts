import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import Joi from 'joi';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

const querySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
});

export async function getPersonen(
    request: HttpRequest,
    _context: InvocationContext
): Promise<HttpResponseInit> {
    const service = new DossierDatabaseService();

    try {
        // Check authentication and get user ID
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await service.initialize();

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Validate query parameters
        const { error, value } = querySchema.validate({
            limit,
            offset,
        });

        if (error) {
            return createErrorResponse('Invalid query parameters: ' + error.details.map(d => d.message).join(', '), 400);
        }

        const { limit: validatedLimit, offset: validatedOffset } = value;

        // Get personen for this user only - try direct first, then via dossier relationships
        let personen = await service.getAllPersonenForUser(userId, validatedLimit, validatedOffset);

        // If no direct personen found, try via dossier relationships
        if (personen.total === 0) {
            try {
                personen = await service.getAllPersonenForUserViaDossiers(userId, validatedLimit, validatedOffset);
            } catch (dossierError) {
                // Continue with empty result from direct method
            }
        }

        return createSuccessResponse({
            data: personen.data,
            pagination: {
                total: personen.total,
                limit: validatedLimit,
                offset: validatedOffset,
                hasMore: validatedOffset + validatedLimit < personen.total,
            },
        });
    } catch (error) {
        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to fetch personen',
            500
        );
    } finally {
        await service.close();
    }
}

app.http('getPersonen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'personen',
    handler: getPersonen,
});