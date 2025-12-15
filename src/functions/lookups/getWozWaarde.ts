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
import { wozService } from '../../services/woz.service';

/**
 * WOZ-waarde lookup endpoint
 *
 * Haalt de WOZ-waarde op voor een adres via PDOK en WOZ-waardeloket.
 *
 * Route: GET /api/woz-waarde
 * Query params:
 *   - postcode (verplicht): Nederlandse postcode (bijv. "1234AB")
 *   - huisnummer (verplicht): Huisnummer (bijv. "1")
 *   - toevoeging (optioneel): Huisnummer toevoeging (bijv. "A" of "bis")
 *
 * Response:
 *   200: { success: true, data: { waarde: number, peildatum: string, adres?: string } }
 *   400: Invalid input (postcode/huisnummer ontbreekt of ongeldig formaat)
 *   404: Adres niet gevonden of geen WOZ-waarde beschikbaar
 *   503: WOZ service niet beschikbaar
 */
export async function getWozWaarde(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const postcode = request.query.get('postcode');
    const huisnummer = request.query.get('huisnummer');
    const toevoeging = request.query.get('toevoeging') || undefined;

    // Validatie: verplichte velden
    if (!postcode || !huisnummer) {
        return createErrorResponse(
            'postcode en huisnummer zijn verplicht',
            400
        );
    }

    // Validatie: postcode formaat (4 cijfers + 2 letters)
    const postcodeRegex = /^\d{4}\s?[A-Z]{2}$/i;
    if (!postcodeRegex.test(postcode)) {
        return createErrorResponse(
            'Ongeldig postcode formaat (verwacht: 1234AB)',
            400
        );
    }

    // Validatie: huisnummer moet numeriek beginnen
    if (!/^\d+/.test(huisnummer)) {
        return createErrorResponse(
            'Huisnummer moet met een cijfer beginnen',
            400
        );
    }

    try {
        context.log(
            `WOZ lookup: ${postcode} ${huisnummer}${toevoeging ? ` ${toevoeging}` : ''}`
        );

        const result = await wozService.lookupWozByAddress(
            postcode,
            huisnummer,
            toevoeging
        );

        context.log(
            `WOZ lookup success: ${postcode} ${huisnummer} -> €${result.waarde} (peildatum: ${result.peildatum})`
        );

        return createSuccessResponse(result);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Onbekende fout';

        context.error(`WOZ lookup error: ${errorMessage}`);

        // Bepaal juiste HTTP status code op basis van error
        if (
            errorMessage.includes('niet gevonden') ||
            errorMessage.includes('niet beschikbaar')
        ) {
            return createErrorResponse(errorMessage, 404);
        }

        if (
            errorMessage.includes('niet beschikbaar') ||
            errorMessage.includes('sessie')
        ) {
            return createErrorResponse(
                'WOZ service tijdelijk niet beschikbaar, probeer later opnieuw',
                503
            );
        }

        return createErrorResponse(errorMessage, 500);
    }
}

// Registreer Azure Function
app.http('getWozWaarde', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'woz-waarde',
    handler: getWozWaarde,
});
