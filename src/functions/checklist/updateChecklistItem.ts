import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ChecklistRepository } from '../../repositories/ChecklistRepository';
import { UpdateChecklistItemDto } from '../../models/Checklist';
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
 * PUT /api/dossiers/{dossierId}/checklist/items/{itemId}
 *
 * Updates a checklist item.
 * Accessible by:
 * - Owner: Can update all fields
 * - Guest: Can only update status, documentId, and notitie
 *
 * Request body (all fields optional):
 * {
 *   "naam"?: string,
 *   "beschrijving"?: string,
 *   "categorieId"?: number,
 *   "toegewezenAanType"?: "partij1" | "partij2" | "gezamenlijk",
 *   "verplicht"?: boolean,
 *   "status"?: "open" | "afgevinkt" | "nvt",
 *   "documentId"?: number | null,
 *   "notitie"?: string
 * }
 */
export async function updateChecklistItem(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Update Checklist Item endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        const itemId = parseInt(request.params.itemId as string);

        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }
        if (isNaN(itemId)) {
            return createErrorResponse('Ongeldig item ID', 400);
        }

        // Authorization
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

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

        // Parse request body
        const body = (await request.json()) as UpdateChecklistItemDto;

        // Validate toegewezenAanType if provided
        if (
            body.toegewezenAanType &&
            !['partij1', 'partij2', 'gezamenlijk'].includes(body.toegewezenAanType)
        ) {
            return createErrorResponse(
                "toegewezenAanType moet 'partij1', 'partij2', of 'gezamenlijk' zijn",
                400
            );
        }

        // Validate status if provided
        if (body.status && !['open', 'afgevinkt', 'nvt'].includes(body.status)) {
            return createErrorResponse("status moet 'open', 'afgevinkt', of 'nvt' zijn", 400);
        }

        // Guests can only update status, documentId, and notitie
        if (access.type === 'guest') {
            const allowedFields = ['status', 'documentId', 'notitie'];
            const providedFields = Object.keys(body);
            const hasDisallowedFields = providedFields.some(
                field => !allowedFields.includes(field)
            );

            if (hasDisallowedFields) {
                return createErrorResponse('Gasten kunnen alleen status, documentId en notitie wijzigen', 403);
            }
        }

        context.log(`Updating checklist item ${itemId}`);

        await repository.updateChecklistItem(
            itemId,
            body,
            access.userId,
            access.gastId
        );

        // Get updated item
        const updatedItem = await repository.getChecklistItemById(itemId);

        context.log(`Updated checklist item ${itemId}`);
        return createSuccessResponse(updatedItem);
    } catch (error) {
        context.error('Error updating checklist item:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij bijwerken item',
            500
        );
    }
}

app.http('updateChecklistItem', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/checklist/items/{itemId}',
    handler: updateChecklistItem,
});
