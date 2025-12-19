import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ChecklistRepository } from '../../repositories/ChecklistRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * GET /api/dossiers/{dossierId}/checklist
 *
 * Returns the checklist for a dossier with all items and progress.
 * Accessible by: Owner, Shared users, Guests with view permission
 *
 * For guests: Only returns items assigned to them.
 */
export async function getDossierChecklist(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Dossier Checklist endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }

        context.log(`Fetching checklist for dossier ID: ${dossierId}`);

        // Authorization
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        const repository = new ChecklistRepository();
        const response = await repository.getCompleteChecklist(dossierId);

        if (!response.checklist) {
            context.log(`No checklist found for dossier ${dossierId}`);
            return createSuccessResponse({
                checklist: null,
                items: [],
                progress: response.progress,
            });
        }

        // For guests: filter to only show items assigned to them
        let filteredItems = response.items;
        if (access.type === 'guest' && access.gastId) {
            filteredItems = response.items.filter(
                item => item.toegewezenAanGastId === access.gastId
            );
        }

        context.log(
            `Found checklist with ${filteredItems.length} items for dossier ${dossierId}`
        );
        return createSuccessResponse({
            checklist: response.checklist,
            items: filteredItems,
            progress: response.progress,
        });
    } catch (error) {
        context.error('Error fetching dossier checklist:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij ophalen checklist',
            500
        );
    }
}

app.http('getDossierChecklist', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/checklist',
    handler: getDossierChecklist,
});
