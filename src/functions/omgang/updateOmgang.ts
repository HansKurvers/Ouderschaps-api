import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OmgangRepository } from '../../repositories/OmgangRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { validateUpdateOmgang } from '../../validators/omgang-validator';
import { UpdateOmgangDto } from '../../models/Dossier';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function updateOmgang(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Update Omgang endpoint called');

    const dossierService = new DossierDatabaseService();
    let omgangRepository: OmgangRepository | undefined;

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await dossierService.initialize();

        // Get omgang ID from route
        const omgangId = parseInt(request.params.omgangId as string);
        if (isNaN(omgangId)) {
            return createErrorResponse('Invalid omgang ID', 400);
        }

        // Parse request body
        const body = await request.json() as UpdateOmgangDto;

        // Validate input data
        const validation = validateUpdateOmgang(body);
        if (validation.error) {
            const errors = validation.error.details.map(d => d.message).join(', ');
            return createErrorResponse(`Validation errors: ${errors}`, 400);
        }

        const validatedData = validation.value as UpdateOmgangDto;

        if (USE_REPOSITORY_PATTERN) {
            omgangRepository = new OmgangRepository();

            // Check if omgang exists and get its dossier ID
            const existingOmgang = await omgangRepository.findById(omgangId);
            if (!existingOmgang) {
                return createErrorResponse('Omgang record not found', 404);
            }

            // Check if user has access to the dossier
            const hasAccess = await dossierService.checkDossierAccess(existingOmgang.omgang.dossierId, userID);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // If verzorger is being updated, validate it
            if (validatedData.verzorgerId !== undefined) {
                const isValidVerzorger = await omgangRepository.validateVerzorger(
                    existingOmgang.omgang.dossierId,
                    validatedData.verzorgerId
                );
                if (!isValidVerzorger) {
                    return createErrorResponse('Verzorger must be a partij in the dossier', 400);
                }
            }

            // If schedule fields are being updated, check for overlap
            const dagId = validatedData.dagId ?? existingOmgang.omgang.dagId;
            const dagdeelId = validatedData.dagdeelId ?? existingOmgang.omgang.dagdeelId;
            const weekRegelingId = validatedData.weekRegelingId ?? existingOmgang.omgang.weekRegelingId;

            const hasOverlap = await omgangRepository.checkOverlap(
                existingOmgang.omgang.dossierId,
                dagId,
                dagdeelId,
                weekRegelingId,
                omgangId // Exclude current record from overlap check
            );
            if (hasOverlap) {
                return createErrorResponse(
                    'Schedule conflict: This time slot is already assigned',
                    409
                );
            }

            // Update omgang record
            const updatedOmgang = await omgangRepository.update(omgangId, validatedData);

            // Fetch the updated record with lookup data
            const omgangWithLookups = await omgangRepository.findById(updatedOmgang.id);

            return createSuccessResponse(omgangWithLookups);
        } else {
            // Legacy path: use database service
            return createErrorResponse('Legacy omgang update not implemented', 501);
        }
    } catch (error) {
        context.error('Error updating omgang:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to update omgang',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('updateOmgang', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'omgang/{omgangId}',
    handler: updateOmgang,
});
