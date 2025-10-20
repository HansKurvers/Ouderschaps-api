import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { PersoonRepository } from '../../repositories/PersoonRepository';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { validatePersoon } from '../../validators/persoon-validator';
import { requireAuthentication } from '../../utils/auth-helper';

// Feature flag: Use new Repository Pattern or legacy DossierDatabaseService
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function createPersoon(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Using ${USE_REPOSITORY_PATTERN ? 'Repository Pattern' : 'Legacy Service'}`);

    const dbService = USE_REPOSITORY_PATTERN ? null : new DossierDatabaseService();
    let persoonData: any = null;

    try {
        // Get user ID from auth
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get request body
        const requestBody = await request.text();
        if (!requestBody) {
            return createErrorResponse('Request body is required', 400);
        }

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

        let newPersoon;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const repository = new PersoonRepository();

            // Check email uniqueness if provided (scoped to user)
            if (value.email) {
                const isEmailUnique = await repository.checkEmailUniqueForUser(value.email, userId);
                if (!isEmailUnique) {
                    return createErrorResponse('Email address already exists', 409);
                }
            }

            // Create persoon with gebruiker_id
            newPersoon = await repository.createForUser(value, userId);
        } else {
            // LEGACY: Use old DossierDatabaseService
            await dbService!.initialize();

            // Check email uniqueness if provided (scoped to user)
            if (value.email) {
                const isEmailUnique = await dbService!.checkEmailUniqueForUser(value.email, userId);
                if (!isEmailUnique) {
                    return createErrorResponse('Email address already exists', 409);
                }
            }

            // Create persoon with gebruiker_id
            newPersoon = await dbService!.createOrUpdatePersoonForUser(value, userId);
        }

        context.log(`Created persoon with ID: ${newPersoon.id}`);
        return createSuccessResponse(newPersoon);

    } catch (error) {
        return createErrorResponse(`Internal server error: ${error instanceof Error ? error.message : String(error)}`, 500);
    } finally {
        if (dbService) {
            await dbService.close();
        }
    }
}

app.http('createPersoon', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'personen',
    handler: createPersoon,
});