import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import { validateOuderRelatie } from '../../validators/kind-validator';

export async function addOuderToKind(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from headers
        const userId = await requireAuthentication(request);
        if (userId === null) {
            return createErrorResponse('User ID is required', 401);
        }

        // Get kind ID from path
        const kindId = Number(request.params.kindId);
        if (!kindId || isNaN(kindId)) {
            return createErrorResponse('Invalid kind ID', 400);
        }

        // Parse and validate request body
        const body = await request.json() as any;
        const { error, value } = validateOuderRelatie(body);
        if (error) {
            return createErrorResponse(
                `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        const { ouderId, ouderData, relatieTypeId } = value;

        // Initialize database connection
        await dbService.initialize();

        // Check if kind exists
        const kind = await dbService.getPersoonById(kindId);
        if (!kind) {
            return createErrorResponse('Kind not found', 404);
        }

        let actualOuderId: number;

        // Handle ouderId vs ouderData
        if (ouderId) {
            // Check if existing ouder exists
            const existingOuder = await dbService.getPersoonById(ouderId);
            if (!existingOuder) {
                return createErrorResponse('Ouder not found', 404);
            }

            // Prevent self-parenting
            if (ouderId === kindId) {
                return createErrorResponse('A person cannot be their own parent', 400);
            }

            // Check if relatie already exists
            const relatieExists = await dbService.checkOuderKindRelatie(kindId, ouderId);
            if (relatieExists) {
                return createErrorResponse('Ouder-kind relatie already exists', 400);
            }

            actualOuderId = ouderId;
        } else {
            // Create new ouder (persoon)
            const newOuder = await dbService.createOrUpdatePersoon(ouderData);
            
            // Prevent self-parenting (should be rare but check anyway)
            if (newOuder.id === kindId) {
                return createErrorResponse('A person cannot be their own parent', 400);
            }

            actualOuderId = newOuder.id;
        }

        // Add ouder-kind relatie
        const relatieId = await dbService.addOuderToKind(kindId, actualOuderId, relatieTypeId);

        // Get the complete relatie data
        const ouders = await dbService.getOudersByKind(kindId);
        const newRelatie = ouders.find(o => o.id === relatieId);

        if (!newRelatie) {
            return createErrorResponse('Failed to retrieve created relatie', 500);
        }

        context.log(`Ouder ${actualOuderId} added to kind ${kindId} with relatie type ${relatieTypeId}`);
        return createSuccessResponse(newRelatie);

    } catch (error) {
        context.error('Error in addOuderToKind:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('addOuderToKind', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'kinderen/{kindId}/ouders',
    handler: addOuderToKind,
});