import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { CreateTemplateRequest } from '../../models/Berichten';

/**
 * POST /api/bericht-templates
 *
 * Creates a new user-specific bericht template.
 * Requires authentication.
 */
export async function createBerichtTemplate(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Bericht Templates endpoint called');

    try {
        // Require authentication
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch {
            return createUnauthorizedResponse();
        }

        // Parse and validate body
        const body = await request.json() as CreateTemplateRequest;

        if (!body.naam || !body.onderwerp || !body.inhoud) {
            return createErrorResponse('naam, onderwerp en inhoud zijn verplicht', 400);
        }

        const repository = new BerichtenRepository();
        const template = await repository.createTemplate(userId, body);

        context.log(`Created template ${template.id} for user ${userId}`);
        return createSuccessResponse(template, 201);
    } catch (error) {
        context.error('Error creating bericht template:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij aanmaken template',
            500
        );
    }
}

app.http('createBerichtTemplate', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'bericht-templates',
    handler: createBerichtTemplate,
});
