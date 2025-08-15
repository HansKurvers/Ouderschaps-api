import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { validatePersoon } from '../../validators/persoon-validator';
import { requireAuthentication } from '../../utils/auth-helper';

export async function createPersoon(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        const userId = await requireAuthentication(request);
        if (userId === null) {
            return createErrorResponse('Unauthorized', 401);
        }

        // Get request body
        const requestBody = await request.text();
        if (!requestBody) {
            return createErrorResponse('Request body is required', 400);
        }

        let persoonData;
        try {
            persoonData = JSON.parse(requestBody);
        } catch (error) {
            return createErrorResponse('Invalid JSON in request body', 400);
        }

        // Validate input
        const { error, value } = validatePersoon(persoonData);
        if (error) {
            return createErrorResponse(
                `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        // Initialize database
        await dbService.initialize();

        // Check email uniqueness if provided
        if (value.email) {
            const isEmailUnique = await dbService.checkEmailUnique(value.email);
            if (!isEmailUnique) {
                return createErrorResponse('Email address already exists', 409);
            }
        }

        // Create persoon
        const newPersoon = await dbService.createOrUpdatePersoon(value);

        context.log(`Created persoon with ID: ${newPersoon.id}`);
        return createSuccessResponse(newPersoon);

    } catch (error) {
        context.error('Error in createPersoon:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('createPersoon', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'personen',
    handler: createPersoon,
});