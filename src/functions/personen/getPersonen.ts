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
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Personen endpoint called');

    const service = new DossierDatabaseService();

    try {
        // Check authentication and get user ID
        let userId: number;
        try {
            userId = await requireAuthentication(request);
            context.log(`Authentication successful for user ID: ${userId}`);
        } catch (authError) {
            context.error('Authentication failed in getPersonen:', authError);
            return createUnauthorizedResponse();
        }

        try {
            await service.initialize();
            context.log('Database connection initialized successfully');
        } catch (dbError) {
            context.error('Database initialization failed in getPersonen:', dbError);
            return createErrorResponse('Database connection failed', 500);
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        context.log(`Query parameters: limit=${limit}, offset=${offset}`);

        // Validate query parameters
        const { error, value } = querySchema.validate({
            limit,
            offset,
        });

        if (error) {
            return createErrorResponse('Invalid query parameters: ' + error.details.map(d => d.message).join(', '), 400);
        }

        const { limit: validatedLimit, offset: validatedOffset } = value;

        // Get personen for this user only
        context.log(`Fetching personen for user ${userId} with limit ${validatedLimit}, offset ${validatedOffset}`);
        const personen = await service.getAllPersonenForUser(userId, validatedLimit, validatedOffset);
        context.log(`Successfully retrieved ${personen.data.length} personen (total: ${personen.total})`);

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
        context.error('Error fetching personen:', error);

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