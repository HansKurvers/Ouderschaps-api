/**
 * Validate Voucher Azure Function
 * POST /api/vouchers/validate
 * Validates a voucher code and returns discount information
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import voucherService from '../../services/voucher.service';

interface ValidateVoucherRequest {
    code: string;
}

export async function validateVoucher(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Authenticate user
        const userId = await requireAuthentication(request);
        context.log('[ValidateVoucher] Request from user:', userId);

        // Parse request body
        const body = await request.json() as ValidateVoucherRequest;

        if (!body.code || typeof body.code !== 'string') {
            return createErrorResponse('Vouchercode is verplicht', 400);
        }

        const code = body.code.trim();
        if (code.length === 0) {
            return createErrorResponse('Vouchercode is verplicht', 400);
        }

        context.log('[ValidateVoucher] Validating code:', code);

        // Validate voucher
        const result = await voucherService.validateVoucher(code, userId);

        if (!result.valid) {
            return createSuccessResponse({
                valid: false,
                reden: result.reden
            }, 200);
        }

        // Return validation result (without internal voucher object)
        return createSuccessResponse({
            valid: true,
            code: result.code,
            naam: result.naam,
            type: result.type,
            waarde: result.waarde,
            omschrijving_klant: result.omschrijving_klant,
            nieuwe_prijs: result.nieuwe_prijs,
            normale_prijs: result.normale_prijs,
            gratis_maanden: result.gratis_maanden
        }, 200);

    } catch (error) {
        context.error('[ValidateVoucher] Error:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij valideren voucher',
            500
        );
    }
}

// Register Azure Function
app.http('validateVoucher', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'vouchers/validate',
    handler: validateVoucher,
});
