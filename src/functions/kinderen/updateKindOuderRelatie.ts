import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';
import { validateUpdateRelatieType } from '../../validators/kind-validator';

export async function updateKindOuderRelatie(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from headers
        const userId = getUserId(request);
        if (!userId) {
            return createErrorResponse('User ID is required', 401);
        }

        // Get kind ID and ouder ID from path
        const kindId = Number(request.params.kindId);
        const ouderId = Number(request.params.ouderId);

        if (!kindId || isNaN(kindId)) {
            return createErrorResponse('Invalid kind ID', 400);
        }
        if (!ouderId || isNaN(ouderId)) {
            return createErrorResponse('Invalid ouder ID', 400);
        }

        // Parse and validate request body
        const body = await request.json() as any;
        const { error, value } = validateUpdateRelatieType(body);
        if (error) {
            return createErrorResponse(
                `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        const { relatieTypeId } = value;

        // Initialize database connection
        await dbService.initialize();

        // Check if kind exists
        const kind = await dbService.getPersoonById(kindId);
        if (!kind) {
            return createErrorResponse('Kind not found', 404);
        }

        // Check if ouder exists
        const ouder = await dbService.getPersoonById(ouderId);
        if (!ouder) {
            return createErrorResponse('Ouder not found', 404);
        }

        // Check if relatie exists
        const relatieExists = await dbService.checkOuderKindRelatie(kindId, ouderId);
        if (!relatieExists) {
            return createErrorResponse('Ouder-kind relatie not found', 404);
        }

        // Update the relatie type
        const success = await dbService.updateOuderKindRelatie(kindId, ouderId, relatieTypeId);
        
        if (!success) {
            return createErrorResponse('Failed to update relatie', 500);
        }

        // Get the updated relatie data
        const ouders = await dbService.getOudersByKind(kindId);
        const updatedRelatie = ouders.find(o => o.ouder.id === ouderId);

        if (!updatedRelatie) {
            return createErrorResponse('Failed to retrieve updated relatie', 500);
        }

        context.log(`Updated relatie type for kind ${kindId} and ouder ${ouderId} to ${relatieTypeId}`);
        return createSuccessResponse(updatedRelatie);

    } catch (error) {
        context.error('Error in updateKindOuderRelatie:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('updateKindOuderRelatie', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'kinderen/{kindId}/ouders/{ouderId}',
    handler: updateKindOuderRelatie,
});