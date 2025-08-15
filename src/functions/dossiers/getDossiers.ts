import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import Joi from 'joi';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

const querySchema = Joi.object({
    includeInactive: Joi.boolean().optional().default(false),
    onlyInactive: Joi.boolean().optional().default(false),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
});

export async function getDossiers(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Dossiers endpoint called');

    const service = new DossierDatabaseService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await service.initialize();

        const { searchParams } = new URL(request.url);
        const includeInactiveParam = searchParams.get('includeInactive');
        const includeInactive = includeInactiveParam !== null ? includeInactiveParam === 'true' : false;
        const onlyInactiveParam = searchParams.get('onlyInactive');
        const onlyInactive = onlyInactiveParam !== null ? onlyInactiveParam === 'true' : false;
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Validate query parameters
        const { error, value } = querySchema.validate({
            includeInactive,
            onlyInactive,
            limit,
            offset,
        });

        if (error) {
            return createErrorResponse('Invalid query parameters: ' + error.details.map(d => d.message).join(', '), 400);
        }

        const { includeInactive: validatedIncludeInactive, onlyInactive: validatedOnlyInactive, limit: validatedLimit, offset: validatedOffset } = value;

        // Get all dossiers for user
        let dossiers = await service.getAllDossiers(userID);

        // Filter based on status
        // By default: only active dossiers (status = false)
        // If includeInactive is true: show all dossiers
        // If onlyInactive is true: only inactive dossiers (status = true)
        if (validatedOnlyInactive) {
            dossiers = dossiers.filter(d => d.status === true);
        } else if (!validatedIncludeInactive) {
            dossiers = dossiers.filter(d => d.status === false);
        }

        // Apply pagination
        const total = dossiers.length;
        const paginatedDossiers = dossiers.slice(validatedOffset, validatedOffset + validatedLimit);

        return createSuccessResponse({
            data: paginatedDossiers,
            pagination: {
                total,
                limit: validatedLimit,
                offset: validatedOffset,
                hasMore: validatedOffset + validatedLimit < total,
            },
        });
    } catch (error) {
        context.error('Error fetching dossiers:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to fetch dossiers',
            500
        );
    } finally {
        await service.close();
    }
}

app.http('getDossiers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers',
    handler: getDossiers,
});
