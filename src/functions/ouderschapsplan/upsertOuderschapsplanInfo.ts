import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import { CreateOuderschapsplanInfoDto } from '../../models/Dossier';
import { validateKinderrekeningArray } from '../../validators/kinderrekening-validator';

export async function upsertOuderschapsplanInfo(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

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

        // Check if user has access to this dossier
        await dbService.initialize();
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Parse request body
        const body = await request.json() as Omit<CreateOuderschapsplanInfoDto, 'dossierId'>;

        // Validate required fields
        if (!body.partij1PersoonId || !body.partij2PersoonId) {
            return createErrorResponse('Partij 1 and Partij 2 persoon IDs are required', 400);
        }

        // Validate kinderrekeningen array if provided
        if (body.bankrekeningnummersOpNaamVanKind !== undefined) {
            const { error } = validateKinderrekeningArray(body.bankrekeningnummersOpNaamVanKind);
            if (error) {
                return createErrorResponse('Validatie fout kinderrekeningen: ' + error.details.map(d => d.message).join(', '), 400);
            }
        }

        // Check if ouderschapsplan info already exists for this dossier
        const existingInfo = await dbService.getOuderschapsplanInfoByDossierId(dossierId);

        let result;
        if (existingInfo) {
            // Update existing
            result = await dbService.updateOuderschapsplanInfo(existingInfo.id, {
                ...body,
                dossierId
            });
            context.log(`Updated ouderschapsplan info for dossier ID: ${dossierId}`);
        } else {
            // Create new
            result = await dbService.createOuderschapsplanInfo({
                ...body,
                dossierId
            });
            context.log(`Created ouderschapsplan info for dossier ID: ${dossierId}`);
        }

        return createSuccessResponse(result, existingInfo ? 200 : 201);

    } catch (error) {
        context.error('Error in upsertOuderschapsplanInfo:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('upsertOuderschapsplanInfo', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/ouderschapsplan-info',
    handler: upsertOuderschapsplanInfo,
});