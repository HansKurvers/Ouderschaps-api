import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ChecklistRepository } from '../../repositories/ChecklistRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * POST /api/dossiers/{dossierId}/checklist
 *
 * Creates a new checklist from a template for a dossier.
 * Only accessible by: Owner
 *
 * Request body:
 * {
 *   "templateId": number
 * }
 */
export async function createDossierChecklist(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Create Dossier Checklist endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }

        // Authorization - only owner can create checklist
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        if (access.type !== 'owner') {
            return createErrorResponse('Alleen de eigenaar kan een checklist aanmaken', 403);
        }

        // Parse request body
        const body = (await request.json()) as { templateId?: number };
        if (!body.templateId) {
            return createErrorResponse('templateId is verplicht', 400);
        }

        context.log(
            `Creating checklist from template ${body.templateId} for dossier ${dossierId}`
        );

        const repository = new ChecklistRepository();
        const checklist = await repository.createChecklistFromTemplate(
            dossierId,
            body.templateId,
            access.userId!
        );

        // Get complete response with items and progress
        const response = await repository.getCompleteChecklist(dossierId);

        context.log(`Created checklist ${checklist.id} for dossier ${dossierId}`);
        return createSuccessResponse(response, 201);
    } catch (error) {
        context.error('Error creating dossier checklist:', error);
        const message = error instanceof Error ? error.message : 'Fout bij aanmaken checklist';
        return createErrorResponse(message, 400);
    }
}

app.http('createDossierChecklist', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/checklist',
    handler: createDossierChecklist,
});
