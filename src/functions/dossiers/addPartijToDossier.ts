import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { DossierRepository, PersoonRepository, PartijRepository } from '../../repositories';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { validateAddPartij } from '../../validators/persoon-validator';
import { requireAuthentication } from '../../utils/auth-helper';

// Feature flag: Use new Repository Pattern or legacy DossierDatabaseService
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function addPartijToDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Using ${USE_REPOSITORY_PATTERN ? 'Repository Pattern' : 'Legacy Service'}`);

    const dbService = USE_REPOSITORY_PATTERN ? null : new DossierDatabaseService();

    try {
        // Get user ID from auth
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Get request body
        const requestBody = await request.text();
        if (!requestBody) {
            return createErrorResponse('Request body is required', 400);
        }

        let requestData;
        try {
            requestData = JSON.parse(requestBody);
        } catch (error) {
            return createErrorResponse('Invalid JSON in request body', 400);
        }

        // Validate input
        const { error, value } = validateAddPartij(requestData);
        if (error) {
            return createErrorResponse(
                `Validation failed: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        let newPartij;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const dossierRepo = new DossierRepository();
            const persoonRepo = new PersoonRepository();
            const partijRepo = new PartijRepository();

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied', 403);
            }

            let persoonId: number;

            // Handle existing person vs new person
            if (value.persoonId) {
                // Check if person exists
                const existingPersoon = await persoonRepo.findById(value.persoonId);
                if (!existingPersoon) {
                    return createErrorResponse('Persoon not found', 404);
                }
                persoonId = value.persoonId;
            } else {
                // Create new person
                const persoonData = value.persoonData;

                // Check email uniqueness if provided
                if (persoonData.email) {
                    const isEmailUnique = await persoonRepo.checkEmailUnique(persoonData.email);
                    if (!isEmailUnique) {
                        return createErrorResponse('Email address already exists', 409);
                    }
                }

                const createdPersoon = await persoonRepo.create(persoonData);
                persoonId = createdPersoon.id;
            }

            // Check if partij combination already exists
            const partijExists = await partijRepo.partijExists(dossierId, persoonId, value.rolId);
            if (partijExists) {
                return createErrorResponse('This person already has this role in this dossier', 409);
            }

            // Add partij to dossier
            newPartij = await partijRepo.create(dossierId, persoonId, value.rolId);
        } else {
            // LEGACY: Use old DossierDatabaseService
            await dbService!.initialize();

            // Check dossier access
            const hasAccess = await dbService!.checkDossierAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied', 403);
            }

            let persoonId: number;

            // Handle existing person vs new person
            if (value.persoonId) {
                // Check if person exists
                const existingPersoon = await dbService!.getPersoonById(value.persoonId);
                if (!existingPersoon) {
                    return createErrorResponse('Persoon not found', 404);
                }
                persoonId = value.persoonId;
            } else {
                // Create new person
                const persoonData = value.persoonData;

                // Check email uniqueness if provided
                if (persoonData.email) {
                    const isEmailUnique = await dbService!.checkEmailUnique(persoonData.email);
                    if (!isEmailUnique) {
                        return createErrorResponse('Email address already exists', 409);
                    }
                }

                const createdPersoon = await dbService!.createOrUpdatePersoon(persoonData);
                persoonId = createdPersoon.id;
            }

            // Check if partij combination already exists
            const partijExists = await dbService!.checkPartijExists(dossierId, persoonId, value.rolId);
            if (partijExists) {
                return createErrorResponse('This person already has this role in this dossier', 409);
            }

            // Add partij to dossier
            newPartij = await dbService!.linkPersoonToDossierWithReturn(dossierId, persoonId, value.rolId);
        }

        context.log(`Added partij ${newPartij.id} to dossier ${dossierId}`);
        return createSuccessResponse(newPartij);

    } catch (error) {
        context.error('Error in addPartijToDossier:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        if (dbService) {
            await dbService.close();
        }
    }
}

app.http('addPartijToDossier', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/partijen',
    handler: addPartijToDossier,
});
