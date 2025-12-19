import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import { getAuthenticatedUserId } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * GET /api/bericht-templates
 *
 * Returns all bericht templates (system + user-specific).
 * No authentication required for reading system templates.
 */
export async function getBerichtTemplates(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Bericht Templates endpoint called');

    try {
        // Get optional user ID (for user-specific templates)
        const userId = await getAuthenticatedUserId(request);

        const repository = new BerichtenRepository();
        const templates = await repository.getTemplates(userId || undefined);

        context.log(`Found ${templates.length} templates`);
        return createSuccessResponse(templates);
    } catch (error) {
        context.error('Error fetching bericht templates:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij ophalen templates',
            500
        );
    }
}

app.http('getBerichtTemplates', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'bericht-templates',
    handler: getBerichtTemplates,
});
