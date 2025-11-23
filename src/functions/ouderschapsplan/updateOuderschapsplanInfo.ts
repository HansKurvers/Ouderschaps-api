import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import { UpdateOuderschapsplanInfoDto } from '../../models/Dossier';
import { validateKinderrekeningArray } from '../../validators/kinderrekening-validator';

export async function updateOuderschapsplanInfo(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        try {
            await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get ouderschapsplan info ID from route
        const infoId = parseInt(request.params.infoId || '');
        if (!infoId || isNaN(infoId)) {
            return createErrorResponse('Invalid ouderschapsplan info ID', 400);
        }

        // Parse request body
        const body = await request.json() as UpdateOuderschapsplanInfoDto;

        // Validate kinderrekeningen array if provided
        if (body.bankrekeningnummersOpNaamVanKind !== undefined) {
            const { error } = validateKinderrekeningArray(body.bankrekeningnummersOpNaamVanKind);
            if (error) {
                return createErrorResponse('Validatie fout kinderrekeningen: ' + error.details.map(d => d.message).join(', '), 400);
            }
        }

        // Update ouderschapsplan info in database
        await dbService.initialize();
        const updatedInfo = await dbService.updateOuderschapsplanInfo(infoId, body);

        context.log(`Updated ouderschapsplan info with ID: ${infoId}`);
        return createSuccessResponse(updatedInfo);

    } catch (error) {
        context.error('Error in updateOuderschapsplanInfo:', error);
        
        if (error instanceof Error && error.message === 'OuderschapsplanInfo not found') {
            return createErrorResponse('Ouderschapsplan info not found', 404);
        }
        
        if (error instanceof Error && error.message === 'No fields to update') {
            return createErrorResponse('No fields to update', 400);
        }
        
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('updateOuderschapsplanInfo', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan/{infoId}',
    handler: updateOuderschapsplanInfo,
});