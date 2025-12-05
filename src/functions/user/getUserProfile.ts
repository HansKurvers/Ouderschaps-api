/**
 * Get User Profile Azure Function
 * GET /api/user/profile
 * Returns user profile including billing information
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { getPool } from '../../config/database';
import { UserProfileResponse } from '../../models/Gebruiker';

export async function getUserProfile(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Authenticate user
        const userId = await requireAuthentication(request);
        context.log('[GetUserProfile] Request from user:', userId);

        const pool = await getPool();

        // Get user with billing profile
        const result = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT
                    id,
                    auth0_id,
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
                    profiel_ingevuld_op,
                    laatste_login,
                    aangemaakt_op,
                    apikey_splitonline
                FROM dbo.gebruikers
                WHERE id = @userId
            `);

        if (result.recordset.length === 0) {
            context.error('[GetUserProfile] User not found:', userId);
            return createErrorResponse('Gebruiker niet gevonden', 404);
        }

        const user = result.recordset[0];

        // Map to response DTO
        const response: UserProfileResponse = {
            id: user.id,
            email: user.email,
            naam: user.naam,
            has_active_subscription: user.has_active_subscription || false,
            apikey_splitonline: user.apikey_splitonline || null,
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
                profiel_compleet: user.profiel_compleet || false,
                profiel_ingevuld_op: user.profiel_ingevuld_op
            }
        };

        context.log('[GetUserProfile] Profile retrieved for user:', userId);

        return createSuccessResponse(response, 200);

    } catch (error) {
        context.error('[GetUserProfile] Error:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij ophalen gebruikersprofiel',
            500
        );
    }
}

// Register Azure Function
app.http('getUserProfile', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'user/profile',
    handler: getUserProfile,
});
