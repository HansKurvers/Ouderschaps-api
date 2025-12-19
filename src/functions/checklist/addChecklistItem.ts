import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ChecklistRepository } from '../../repositories/ChecklistRepository';
import { CreateChecklistItemDto } from '../../models/Checklist';
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
 * POST /api/dossiers/{dossierId}/checklist/items
 *
 * Adds a new item to the dossier's checklist.
 * Only accessible by: Owner
 *
 * Request body:
 * {
 *   "naam": string (required),
 *   "beschrijving"?: string,
 *   "categorieId"?: number,
 *   "toegewezenAanType": "partij1" | "partij2" | "gezamenlijk" (required),
 *   "verplicht"?: boolean (default: true)
 * }
 */
export async function addChecklistItem(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Add Checklist Item endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }

        // Authorization - only owner can add items
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        if (access.type !== 'owner') {
            return createErrorResponse('Alleen de eigenaar kan items toevoegen', 403);
        }

        // Check checklist exists
        const repository = new ChecklistRepository();
        const checklist = await repository.getDossierChecklist(dossierId);

        if (!checklist) {
            return createNotFoundResponse('Checklist');
        }

        // Parse and validate request body
        const body = (await request.json()) as CreateChecklistItemDto;
        if (!body.naam || !body.toegewezenAanType) {
            return createErrorResponse('naam en toegewezenAanType zijn verplicht', 400);
        }

        // Validate toegewezenAanType
        if (!['partij1', 'partij2', 'gezamenlijk'].includes(body.toegewezenAanType)) {
            return createErrorResponse(
                "toegewezenAanType moet 'partij1', 'partij2', of 'gezamenlijk' zijn",
                400
            );
        }

        context.log(`Adding item "${body.naam}" to checklist ${checklist.id}`);

        const item = await repository.addChecklistItem(checklist.id, body);

        context.log(`Added item ${item.id} to checklist ${checklist.id}`);
        return createSuccessResponse(item, 201);
    } catch (error) {
        context.error('Error adding checklist item:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij toevoegen item',
            500
        );
    }
}

app.http('addChecklistItem', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/checklist/items',
    handler: addChecklistItem,
});
