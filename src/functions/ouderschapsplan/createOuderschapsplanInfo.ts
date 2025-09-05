import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import { CreateOuderschapsplanInfoDto } from '../../models/Dossier';

export async function createOuderschapsplanInfo(
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

        // Parse request body
        const body = await request.json() as CreateOuderschapsplanInfoDto;

        // Validate required fields
        if (!body.partij1PersoonId || !body.partij2PersoonId) {
            return createErrorResponse('Partij 1 and Partij 2 persoon IDs are required', 400);
        }

        // Create ouderschapsplan info in database
        await dbService.initialize();
        const newInfo = await dbService.createOuderschapsplanInfo(body);

        context.log(`Created ouderschapsplan info with ID: ${newInfo.id}`);
        return createSuccessResponse(newInfo, 201);

    } catch (error) {
        context.error('Error in createOuderschapsplanInfo:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('createOuderschapsplanInfo', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan',
    handler: createOuderschapsplanInfo,
});