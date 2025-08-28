import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

export async function getAlimentatieTemplates(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Alimentatie Templates endpoint called');

    const alimentatieService = new AlimentatieService();

    try {
        // Check authentication
        try {
            await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // Get all templates
        const templates = await alimentatieService.getTemplates();

        return createSuccessResponse(templates, 200);
    } catch (error) {
        context.error('Error getting alimentatie templates:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to get templates',
            500
        );
    }
}

app.http('getAlimentatieTemplates', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'alimentatie/templates',
    handler: getAlimentatieTemplates,
});