import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ChecklistRepository } from '../../repositories/ChecklistRepository';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * GET /api/checklist-templates/{templateId}/items
 *
 * Returns all items for a specific template.
 * No authentication required - templates are public read-only.
 */
export async function getChecklistTemplateItems(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Checklist Template Items endpoint called');

    try {
        const templateId = parseInt(request.params.templateId as string);
        if (isNaN(templateId)) {
            return createErrorResponse('Ongeldig template ID', 400);
        }

        context.log(`Fetching items for template ID: ${templateId}`);

        const repository = new ChecklistRepository();
        const items = await repository.getTemplateItems(templateId);

        context.log(`Found ${items.length} items for template ${templateId}`);
        return createSuccessResponse(items);
    } catch (error) {
        context.error('Error fetching template items:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij ophalen template items',
            500
        );
    }
}

app.http('getChecklistTemplateItems', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'checklist-templates/{templateId}/items',
    handler: getChecklistTemplateItems,
});
