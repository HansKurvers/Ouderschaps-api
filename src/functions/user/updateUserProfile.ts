/**
 * Update User Profile Azure Function
 * PUT /api/user/profile
 * Updates user billing profile information
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { validateBillingProfile } from '../../validators/billing-profile-validator';
import { getPool } from '../../config/database';
import { UpdateBillingProfileDTO } from '../../models/Gebruiker';

export async function updateUserProfile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Authenticate user
        const userId = await requireAuthentication(request);
        context.log('[UpdateUserProfile] Request from user:', userId);

        // Parse request body
        const body = await request.json() as UpdateBillingProfileDTO;

        // Validate input
        const { error, value } = validateBillingProfile(body);
        if (error) {
            const errorMessages = error.details.map(d => d.message).join(', ');
            context.log('[UpdateUserProfile] Validation error:', errorMessages);
            return createErrorResponse('Validatiefout: ' + errorMessages, 400);
        }

        const pool = await getPool();

        // Update user billing profile
        const result = await pool.request()
            .input('userId', userId)
            .input('klantType', value.klant_type)
            .input('telefoon', value.telefoon || null)
            .input('straat', value.straat)
            .input('huisnummer', value.huisnummer)
            .input('postcode', value.postcode)
            .input('plaats', value.plaats)
            .input('land', value.land || 'NL')
            .input('bedrijfsnaam', value.bedrijfsnaam || null)
            .input('btwNummer', value.btw_nummer || null)
            .input('kvkNummer', value.kvk_nummer || null)
            .input('isZakelijk', value.klant_type === 'zakelijk' ? 1 : 0)
            .query(`
                UPDATE dbo.gebruikers
                SET
                    klant_type = @klantType,
                    telefoon = @telefoon,
                    straat = @straat,
                    huisnummer = @huisnummer,
                    postcode = @postcode,
                    plaats = @plaats,
                    land = @land,
                    bedrijfsnaam = @bedrijfsnaam,
                    btw_nummer = @btwNummer,
                    kvk_nummer = @kvkNummer,
                    is_zakelijk = @isZakelijk,
                    profiel_compleet = 1,
                    profiel_ingevuld_op = GETDATE(),
                    gewijzigd_op = GETDATE()
                WHERE id = @userId
            `);

        if (result.rowsAffected[0] === 0) {
            context.error('[UpdateUserProfile] User not found:', userId);
            return createErrorResponse('Gebruiker niet gevonden', 404);
        }

        // Fetch updated profile
        const updatedResult = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT
                    id,
                    email,
                    naam,
                    has_active_subscription,
                    klant_type,
                    telefoon,
                    straat,
                    huisnummer,
                    postcode,
                    plaats,
                    land,
                    bedrijfsnaam,
                    btw_nummer,
                    kvk_nummer,
                    profiel_compleet,
                    profiel_ingevuld_op
                FROM dbo.gebruikers
                WHERE id = @userId
            `);

        const user = updatedResult.recordset[0];

        context.log('[UpdateUserProfile] Profile updated for user:', userId);

        return createSuccessResponse({
            message: 'Profiel succesvol bijgewerkt',
            profile: {
                id: user.id,
                email: user.email,
                naam: user.naam,
                has_active_subscription: user.has_active_subscription,
                billing_profile: {
                    klant_type: user.klant_type,
                    telefoon: user.telefoon,
                    straat: user.straat,
                    huisnummer: user.huisnummer,
                    postcode: user.postcode,
                    plaats: user.plaats,
                    land: user.land,
                    bedrijfsnaam: user.bedrijfsnaam,
                    btw_nummer: user.btw_nummer,
                    kvk_nummer: user.kvk_nummer,
                    profiel_compleet: user.profiel_compleet,
                    profiel_ingevuld_op: user.profiel_ingevuld_op
                }
            }
        }, 200);

    } catch (error) {
        context.error('[UpdateUserProfile] Error:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij bijwerken gebruikersprofiel',
            500
        );
    }
}

// Register Azure Function
app.http('updateUserProfile', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'user/profile',
    handler: updateUserProfile,
});
