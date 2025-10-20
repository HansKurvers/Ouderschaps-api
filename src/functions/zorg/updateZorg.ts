import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { updateZorgSchema } from '../../validators/zorg-validator';
import { requireAuthentication } from '../../utils/auth-helper';
import { UpdateZorgDto } from '../../repositories/interfaces/IZorgRepository';

/**
 * HTTP function to update an existing zorg record
 *
 * Route: PUT /api/zorg/{zorgId}
 *
 * Request Body (UpdateZorgDto - all fields optional except gewijzigdDoor):
 * {
 *   "zorgCategorieId"?: number,
 *   "zorgSituatieId"?: number,
 *   "overeenkomst"?: string,
 *   "situatieAnders"?: string
 * }
 *
 * Business Logic:
 * 1. Authenticate user
 * 2. Validate request body
 * 3. Check zorg exists and get its dossier
 * 4. Check dossier access
 * 5. If categorie/situatie changed, validate they match
 * 6. Update zorg record
 *
 * Returns:
 * - 200: Zorg updated successfully
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Access denied
 * - 404: Zorg not found
 * - 500: Server error
 */
export async function updateZorg(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Update Zorg endpoint called');

    const useRepository = process.env.USE_REPOSITORY_PATTERN === 'true';

    try {
        // Check authentication
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // Get zorg ID from route
        const zorgId = parseInt(request.params.zorgId as string);
        if (isNaN(zorgId)) {
            return createErrorResponse('Invalid zorg ID', 400);
        }

        // Parse and validate request body
        const body = await request.json() as any;
        const { error, value } = updateZorgSchema.validate({
            ...(body as object),
            gewijzigdDoor: userId
        }, { abortEarly: false });

        if (error) {
            const errorMessages = error.details.map(d => d.message).join(', ');
            return createErrorResponse(`Validation failed: ${errorMessages}`, 400);
        }

        if (useRepository) {
            context.log('Using ZorgRepository pattern');

            const zorgRepo = new ZorgRepository();
            const dossierRepo = new DossierRepository();

            // Check if zorg exists and get its dossier
            const existingZorg = await zorgRepo.findById(zorgId);
            if (!existingZorg) {
                return createErrorResponse('Zorg not found', 404);
            }

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(existingZorg.zorg.dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // If categorie or situatie is being changed, validate they match
            if (value.zorgCategorieId || value.zorgSituatieId) {
                const categorieId = value.zorgCategorieId || existingZorg.zorg.zorgCategorieId;
                const situatieId = value.zorgSituatieId || existingZorg.zorg.zorgSituatieId;

                const isValidSituatie = await zorgRepo.validateSituatieForCategorie(
                    situatieId,
                    categorieId
                );

                if (!isValidSituatie) {
                    return createErrorResponse(
                        'Situatie does not belong to the selected categorie',
                        400
                    );
                }
            }

            // Update zorg record
            const updatedZorg = await zorgRepo.update(zorgId, value as UpdateZorgDto);

            context.log(`Updated zorg with ID: ${zorgId}`);
            return createSuccessResponse(updatedZorg, 200);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented yet', 501);
        }

    } catch (error) {
        context.error('Error in updateZorg:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('updateZorg', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'zorg/{zorgId}',
    handler: updateZorg,
});
