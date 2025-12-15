import {
    app,
    HttpRequest,
    HttpResponseInit,
    InvocationContext,
} from '@azure/functions';
import {
    createSuccessResponse,
    createErrorResponse,
} from '../../utils/response-helper';
import { rdwService } from '../../services/rdw.service';

/**
 * Voertuig lookup endpoint
 *
 * Haalt voertuiggegevens op via RDW Open Data API.
 *
 * Route: GET /api/voertuig
 * Query params:
 *   - kenteken (verplicht): Nederlands kenteken (bijv. "AB123CD" of "AB-123-CD")
 *
 * Response:
 *   200: { success: true, data: { kenteken, merk, handelsbenaming, catalogusprijs?, voertuigsoort?, kleur? } }
 *   400: Invalid input (kenteken ontbreekt of ongeldig formaat)
 *   404: Kenteken niet gevonden
 */
export async function getVoertuig(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const kenteken = request.query.get('kenteken');

    // Validatie: verplicht veld
    if (!kenteken) {
        return createErrorResponse('kenteken is verplicht', 400);
    }

    // Validatie: kenteken formaat (6-8 alfanumerieke karakters, streepjes toegestaan)
    const cleanedKenteken = kenteken.replace(/[\s-]/g, '');
    if (!/^[A-Z0-9]{6,8}$/i.test(cleanedKenteken)) {
        return createErrorResponse(
            'Ongeldig kenteken formaat (verwacht: 6-8 letters/cijfers)',
            400
        );
    }

    try {
        context.log(`RDW lookup: ${kenteken}`);

        const result = await rdwService.lookupByKenteken(kenteken);

        context.log(
            `RDW lookup success: ${kenteken} -> ${result.merk} ${result.handelsbenaming}`
        );

        return createSuccessResponse(result);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Onbekende fout';

        context.error(`RDW lookup error: ${errorMessage}`);

        // Bepaal juiste HTTP status code op basis van error
        if (errorMessage.includes('niet gevonden')) {
            return createErrorResponse(errorMessage, 404);
        }

        return createErrorResponse(errorMessage, 500);
    }
}

// Registreer Azure Function
app.http('getVoertuig', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'voertuig',
    handler: getVoertuig,
});
