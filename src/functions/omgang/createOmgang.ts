import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OmgangRepository } from '../../repositories/OmgangRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { validateCreateOmgang } from '../../validators/omgang-validator';
import { CreateOmgangDto } from '../../models/Dossier';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function createOmgang(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Create Omgang endpoint called');

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

        // Parse request body
        const body = await request.json() as CreateOmgangDto;

        // Validate input data
        const validation = validateCreateOmgang(body);
        if (validation.error) {
            const errors = validation.error.details.map(d => d.message).join(', ');
            return createErrorResponse(`Validation errors: ${errors}`, 400);
        }

        const validatedData = validation.value as CreateOmgangDto;

        // Check if user has access to this dossier
        const hasAccess = await dossierService.checkDossierAccess(validatedData.dossierId, userID);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        if (USE_REPOSITORY_PATTERN) {
            omgangRepository = new OmgangRepository();

            // Validate verzorger is a partij in the dossier
            const isValidVerzorger = await omgangRepository.validateVerzorger(
                validatedData.dossierId,
                validatedData.verzorgerId
            );
            if (!isValidVerzorger) {
                return createErrorResponse('Verzorger must be a partij in the dossier', 400);
            }

            // Check for schedule overlap
            const hasOverlap = await omgangRepository.checkOverlap(
                validatedData.dossierId,
                validatedData.dagId,
                validatedData.dagdeelId,
                validatedData.weekRegelingId
            );
            if (hasOverlap) {
                return createErrorResponse(
                    'Schedule conflict: This time slot is already assigned',
                    409
                );
            }

            // Create omgang record
            const omgang = await omgangRepository.create(validatedData);

            // Fetch the created record with lookup data
            const omgangWithLookups = await omgangRepository.findById(omgang.id);

            return createSuccessResponse(omgangWithLookups, 201);
        } else {
            // Legacy path: use database service
            return createErrorResponse('Legacy omgang creation not implemented', 501);
        }
    } catch (error) {
        context.error('Error creating omgang:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to create omgang',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('createOmgang', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'omgang',
    handler: createOmgang,
});
