import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { CreateAlimentatieDto } from '../../models/Alimentatie';
// import { AlimentatieValidator } from '../../validators/alimentatie-validator';

export async function upsertAlimentatie(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Upsert Alimentatie endpoint called');

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

        // Validate data (commented out - old validator removed)
        // const validation = AlimentatieValidator.validateCreateAlimentatie(body);
        // if (!validation.valid) {
        //     return createErrorResponse(`Validation errors: ${validation.errors.join(', ')}`, 400);
        // }

        // Upsert alimentatie (will create new or update existing)
        const alimentatie = await alimentatieService.upsertAlimentatie(dossierId, body);

        // Check if this was an update or create
        const existing = await alimentatieService.getAlimentatieByDossierId(dossierId);
        const statusCode = existing && existing.alimentatie.id !== alimentatie.id ? 200 : 201;

        return createSuccessResponse(alimentatie, statusCode);
    } catch (error) {
        context.error('Error upserting alimentatie:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to upsert alimentatie',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('upsertAlimentatie', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/alimentatie/upsert',
    handler: upsertAlimentatie,
});