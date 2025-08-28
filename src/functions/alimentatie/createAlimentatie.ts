import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { CreateAlimentatieDto } from '../../models/Alimentatie';
import { AlimentatieValidator } from '../../validators/alimentatie-validator';

export async function createAlimentatie(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Create Alimentatie endpoint called');

    const alimentatieService = new AlimentatieService();
    const dossierService = new DossierDatabaseService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await dossierService.initialize();

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Check if user has access to this dossier
        const hasAccess = await dossierService.checkDossierAccess(dossierId, userID);
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Parse request body
        const body = await request.json() as CreateAlimentatieDto;

        // Validate data
        const validation = AlimentatieValidator.validateCreateAlimentatie(body);
        if (!validation.valid) {
            return createErrorResponse(`Validation errors: ${validation.errors.join(', ')}`, 400);
        }

        // Check if alimentatie already exists for this dossier
        const existing = await alimentatieService.getAlimentatieByDossierId(dossierId);
        if (existing) {
            return createErrorResponse('Alimentatie already exists for this dossier', 409);
        }

        // Create new alimentatie
        const newAlimentatie = await alimentatieService.createAlimentatie(dossierId, body);

        return createSuccessResponse(newAlimentatie, 201);
    } catch (error) {
        context.error('Error creating alimentatie:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to create alimentatie',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('createAlimentatie', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/alimentatie',
    handler: createAlimentatie,
});