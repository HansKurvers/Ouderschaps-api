import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { createZorgSchema } from '../../validators/zorg-validator';
import { requireAuthentication } from '../../utils/auth-helper';
import { CreateZorgDto } from '../../repositories/interfaces/IZorgRepository';

/**
 * HTTP function to create a new zorg record
 *
 * Route: POST /api/dossiers/{dossierId}/zorg
 *
 * Request Body (CreateZorgDto):
 * {
 *   "zorgCategorieId": number,
 *   "zorgSituatieId": number,
 *   "overeenkomst": string,
 *   "situatieAnders"?: string
 * }
 *
 * Business Logic:
 * 1. Authenticate user
 * 2. Validate request body
 * 3. Check dossier access
 * 4. Validate situatie belongs to categorie
 * 5. Create zorg record
 *
 * Returns:
 * - 201: Zorg created successfully
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Access denied
 * - 500: Server error
 */
export async function createZorg(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Create Zorg endpoint called');

    const useRepository = process.env.USE_REPOSITORY_PATTERN === 'true';

    try {
        // Check authentication
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Parse and validate request body
        const body = await request.json() as any;
        const { error, value } = createZorgSchema.validate({
            ...(body as object),
            dossierId,
            aangemaaktDoor: userId
        }, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map(d => d.message).join(', ');
            return createErrorResponse(`Validation failed: ${errorMessages}`, 400);
        }

        if (useRepository) {
            context.log('Using ZorgRepository pattern');

            const zorgRepo = new ZorgRepository();
            const dossierRepo = new DossierRepository();

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // Validate situatie belongs to categorie
            const isValidSituatie = await zorgRepo.validateSituatieForCategorie(
                value.zorgSituatieId,
                value.zorgCategorieId
            );
            if (!isValidSituatie) {
                return createErrorResponse(
                    'Situatie does not belong to the selected categorie',
                    400
                );
            }

            // Create zorg record
            const zorg = await zorgRepo.create(value as CreateZorgDto);

            context.log(`Created zorg with ID: ${zorg.id}`);
            return createSuccessResponse(zorg, 201);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented yet', 501);
        }

    } catch (error) {
        context.error('Error in createZorg:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('createZorg', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/zorg',
    handler: createZorg,
});
