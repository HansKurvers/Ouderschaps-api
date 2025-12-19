import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ChecklistRepository } from '../../repositories/ChecklistRepository';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * GET /api/checklist-templates
 *
 * Returns all active checklist templates.
 * No authentication required - templates are public read-only.
 *
 * Query params:
 * - type: Filter by template type (echtscheiding, ouderschapsplan, mediation)
 */
export async function getChecklistTemplates(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Checklist Templates endpoint called');

    try {
        const type = request.query.get('type') || undefined;
        context.log(`Fetching templates${type ? ` for type: ${type}` : ''}`);

        const repository = new ChecklistRepository();
        const templates = await repository.getTemplates(type);

        context.log(`Found ${templates.length} templates`);
        return createSuccessResponse(templates);
    } catch (error) {
        context.error('Error fetching checklist templates:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij ophalen templates',
            500
        );
    }
}

app.http('getChecklistTemplates', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'checklist-templates',
    handler: getChecklistTemplates,
});
