import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ChecklistRepository } from '../../repositories/ChecklistRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import {
    createSuccessResponse,
    createErrorResponse,
    createNotFoundResponse,
} from '../../utils/response-helper';

/**
 * DELETE /api/dossiers/{dossierId}/checklist/items/{itemId}
 *
 * Deletes a checklist item.
 * Only accessible by: Owner
 */
export async function deleteChecklistItem(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Checklist Item endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        const itemId = parseInt(request.params.itemId as string);

        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }
        if (isNaN(itemId)) {
            return createErrorResponse('Ongeldig item ID', 400);
        }

        // Authorization - only owner can delete items
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        if (access.type !== 'owner') {
            return createErrorResponse('Alleen de eigenaar kan items verwijderen', 403);
        }

        const repository = new ChecklistRepository();

        // Verify item exists and belongs to this dossier
        const item = await repository.getChecklistItemById(itemId);
        if (!item) {
            return createNotFoundResponse('Checklist item');
        }

        const checklistDossierId = await repository.getDossierIdForChecklist(item.checklistId);
        if (checklistDossierId !== dossierId) {
            return createErrorResponse('Item behoort niet tot dit dossier', 403);
        }

        context.log(`Deleting checklist item ${itemId} from dossier ${dossierId}`);

        await repository.deleteChecklistItem(itemId);

        context.log(`Deleted checklist item ${itemId}`);
        return createSuccessResponse({ deleted: true });
    } catch (error) {
        context.error('Error deleting checklist item:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij verwijderen item',
            500
        );
    }
}

app.http('deleteChecklistItem', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/checklist/items/{itemId}',
    handler: deleteChecklistItem,
});
