import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import { validateCreateOmgang } from '../../validators/omgang-validator';
import { CreateOmgangDto } from '../../models/Dossier';

export async function createOmgang(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        const requestBody = await request.json() as any;
        const { error, value } = validateCreateOmgang(requestBody);
        if (error) {
            return createErrorResponse(
                `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        await dbService.initialize();

        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        const createData: CreateOmgangDto = {
            dossierId,
            ...value
        };

        const newOmgang = await dbService.createOmgang(createData);

        context.log(`Created omgang with ID ${newOmgang.id} for dossier ${dossierId}`);
        return createSuccessResponse(newOmgang, 201);

    } catch (error) {
        context.error('Error in createOmgang:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('createOmgang', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang',
    handler: createOmgang,
});
