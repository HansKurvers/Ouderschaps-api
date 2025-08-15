import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { validateUpdatePersoon } from '../../validators/persoon-validator';
import { requireAuthentication } from '../../utils/auth-helper';

export async function updatePersoon(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        try {
            await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
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

        let updateData;
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

        // Check if persoon exists
        const existingPersoon = await dbService.getPersoonById(persoonId);
        if (!existingPersoon) {
            return createErrorResponse('Persoon not found', 404);
        }

        // Check email uniqueness if provided and changed
        if (value.email && value.email !== existingPersoon.email) {
            const isEmailUnique = await dbService.checkEmailUnique(value.email, persoonId);
            if (!isEmailUnique) {
                return createErrorResponse('Email address already exists', 409);
            }
        }

        // Update persoon
        const updatedPersoon = await dbService.createOrUpdatePersoon({
            ...existingPersoon,
            ...value,
            id: persoonId
        });

        context.log(`Updated persoon with ID: ${persoonId}`);
        return createSuccessResponse(updatedPersoon);

    } catch (error) {
        context.error('Error in updatePersoon:', error);
        return createErrorResponse('Internal server error', 500);
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