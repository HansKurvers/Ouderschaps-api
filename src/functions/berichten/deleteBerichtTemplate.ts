import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

/**
 * DELETE /api/bericht-templates/{templateId}
 *
 * Deletes a user-specific bericht template.
 * Cannot delete system templates.
 * Requires authentication.
 */
export async function deleteBerichtTemplate(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Bericht Templates endpoint called');

    try {
        // Require authentication
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch {
            return createUnauthorizedResponse();
        }

        const templateId = parseInt(request.params.templateId as string);
        if (isNaN(templateId)) {
            return createErrorResponse('Ongeldig template ID', 400);
        }

        const repository = new BerichtenRepository();
        await repository.deleteTemplate(templateId, userId);

        context.log(`Deleted template ${templateId} for user ${userId}`);
        return createSuccessResponse({ deleted: true });
    } catch (error) {
        context.error('Error deleting bericht template:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij verwijderen template',
            500
        );
    }
}

app.http('deleteBerichtTemplate', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'bericht-templates/{templateId}',
    handler: deleteBerichtTemplate,
});
