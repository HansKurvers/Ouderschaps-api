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
 * DELETE /api/dossiers/{dossierId}/checklist
 *
 * Deletes the checklist for a dossier (and all its items).
 * Only accessible by: Owner
 */
export async function deleteDossierChecklist(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Dossier Checklist endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }

        // Authorization - only owner can delete checklist
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        if (access.type !== 'owner') {
            return createErrorResponse('Alleen de eigenaar kan de checklist verwijderen', 403);
        }

        context.log(`Deleting checklist for dossier ${dossierId}`);

        const repository = new ChecklistRepository();
        const checklist = await repository.getDossierChecklist(dossierId);

        if (!checklist) {
            return createNotFoundResponse('Checklist');
        }

        await repository.deleteChecklist(checklist.id);

        context.log(`Deleted checklist ${checklist.id} for dossier ${dossierId}`);
        return createSuccessResponse({ deleted: true });
    } catch (error) {
        context.error('Error deleting dossier checklist:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij verwijderen checklist',
            500
        );
    }
}

app.http('deleteDossierChecklist', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/checklist',
    handler: deleteDossierChecklist,
});
