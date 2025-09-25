import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { validateUpdatePersoon } from '../../validators/persoon-validator';
import { requireAuthentication } from '../../utils/auth-helper';

export async function updatePersoon(
    request: HttpRequest,
    _context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();
    let updateData: any = null;

    try {
        // Get user ID from auth
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createErrorResponse('Authentication required', 401);
        }

        // Get persoon ID from route
        const persoonId = parseInt(request.params.persoonId || '');
        if (!persoonId || isNaN(persoonId)) {
            return createErrorResponse('Invalid persoon ID', 400);
        }

        // Get request body
        const requestBody = await request.text();
        if (!requestBody) {
            return createErrorResponse('Request body is required', 400);
        }

        try {
            updateData = JSON.parse(requestBody);
        } catch (error) {
            return createErrorResponse('Invalid JSON in request body', 400);
        }

        // Validate input
        const { error, value } = validateUpdatePersoon(updateData);
        if (error) {
            return createErrorResponse(
                `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        // Initialize database
        await dbService.initialize();

        // Check if persoon exists and belongs to this user
        const existingPersoon = await dbService.getPersoonByIdForUser(persoonId, userId);
        if (!existingPersoon) {
            return createErrorResponse('Persoon not found', 404);
        }

        // Check email uniqueness if provided and changed (scoped to user)
        if (value.email && value.email !== existingPersoon.email) {
            const isEmailUnique = await dbService.checkEmailUniqueForUser(value.email, userId, persoonId);
            if (!isEmailUnique) {
                return createErrorResponse('Email address already exists', 409);
            }
        }

        // Update persoon (maintaining gebruiker_id)
        const updatedPersoon = await dbService.updatePersoonForUser({
            ...existingPersoon,
            ...value,
            id: persoonId
        }, userId);

        return createSuccessResponse(updatedPersoon);

    } catch (error) {
        return createErrorResponse(`Internal server error: ${error instanceof Error ? error.message : String(error)}`, 500);
    } finally {
        await dbService.close();
    }
}

app.http('updatePersoon', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'personen/{persoonId}',
    handler: updatePersoon,
});