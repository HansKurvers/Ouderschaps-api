import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import { validateAddKind } from '../../validators/kind-validator';

export async function addKindToDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from headers
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get dossier ID from path
        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Parse and validate request body
        const body = await request.json() as any;
        const { error, value } = validateAddKind(body);
        if (error) {
            return createErrorResponse(
                `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        const { kindId, kindData, ouderRelaties } = value;

        // Initialize database connection
        await dbService.initialize();

        // Check dossier access
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        let actualKindId: number;

        // Handle kindId vs kindData
        if (kindId) {
            // Check if existing kind exists
            const existingKind = await dbService.getPersoonById(kindId);
            if (!existingKind) {
                return createErrorResponse('Kind not found', 404);
            }

            // Check if kind is already in this dossier
            const alreadyInDossier = await dbService.checkKindInDossier(dossierId, kindId);
            if (alreadyInDossier) {
                return createErrorResponse('Kind is already in this dossier', 400);
            }

            actualKindId = kindId;
        } else {
            // Create new kind (persoon)
            const newKind = await dbService.createOrUpdatePersoon(kindData);
            actualKindId = newKind.id;
        }

        // Add kind to dossier
        const dossierKindId = await dbService.addKindToDossier(dossierId, actualKindId);

        // Handle ouder relaties if provided
        if (ouderRelaties && ouderRelaties.length > 0) {
            for (const relatie of ouderRelaties) {
                // Check if ouder exists
                const ouder = await dbService.getPersoonById(relatie.ouderId);
                if (!ouder) {
                    context.warn(`Ouder ${relatie.ouderId} not found, skipping relatie`);
                    continue;
                }

                // Check if relatie already exists
                const relatieExists = await dbService.checkOuderKindRelatie(actualKindId, relatie.ouderId);
                if (!relatieExists) {
                    await dbService.addOuderToKind(actualKindId, relatie.ouderId, relatie.relatieTypeId);
                }
            }
        }

        // Get complete kind data with ouders
        const completeKind = await dbService.getKindWithOudersById(dossierKindId);
        if (!completeKind) {
            return createErrorResponse('Failed to retrieve created kind', 500);
        }

        context.log(`Kind ${actualKindId} added to dossier ${dossierId}`);
        return createSuccessResponse(completeKind);

    } catch (error) {
        context.error('Error in addKindToDossier:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('addKindToDossier', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/kinderen',
    handler: addKindToDossier,
});