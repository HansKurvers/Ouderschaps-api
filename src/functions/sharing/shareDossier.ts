import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createForbiddenResponse } from '../../utils/response-helper';
import { GedeeldeDossierRepository } from '../../repositories/GedeeldeDossierRepository';
import { GebruikerRepository } from '../../repositories/GebruikerRepository';
import { Auth0InviteService } from '../../services/auth/auth0-invite.service';
import { getPool } from '../../config/database';
import Joi from 'joi';

const shareSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Ongeldig email adres',
        'any.required': 'Email is verplicht'
    })
});

/**
 * POST /api/dossiers/{id}/delen
 * Share dossier with user by email - ULTRA SIMPLIFIED!
 *
 * Flow:
 * 1. Find/create user in dbo.gebruikers (always!)
 * 2. Share dossier with gebruiker_id
 * 3. If new user → invite via Auth0
 */
export async function shareDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        // 1. Auth
        const userId = await requireAuthentication(request);

        // 2. Validate
        const dossierId = parseInt(request.params.id || '');
        if (isNaN(dossierId)) {
            return createErrorResponse('Ongeldig dossier ID', 400);
        }

        const body = await request.json();
        const { error, value } = shareSchema.validate(body);
        if (error) {
            return createErrorResponse(error.details[0].message, 400);
        }

        const { email } = value;

        // 3. Check subscription - sharing requires Pro
        const pool = await getPool();
        const subscriptionResult = await pool.request()
            .input('userId', userId)
            .query(`
                SELECT has_active_subscription
                FROM dbo.gebruikers
                WHERE id = @userId
            `);

        const hasSubscription = subscriptionResult.recordset[0]?.has_active_subscription;
        if (!hasSubscription) {
            return createErrorResponse('Dossiers delen is alleen beschikbaar met een Pro-abonnement', 403);
        }

        // 4. Check ownership
        const shareRepo = new GedeeldeDossierRepository();
        const isOwner = await shareRepo.isOwner(dossierId, userId);
        if (!isOwner) {
            return createForbiddenResponse();
        }

        // 5. Find or create user in database
        const userRepo = new GebruikerRepository();
        let gebruiker = await userRepo.findByEmail(email);
        let isNewUser = false;

        if (!gebruiker) {
            // User doesn't exist in our DB - check Auth0 and create
            const auth0 = new Auth0InviteService();
            let auth0User;

            context.log(`[ShareDossier] Looking up email in Auth0: ${email}`);
            context.log(`[ShareDossier] Auth0 config - Domain: ${process.env.AUTH0_DOMAIN}, MGMT_CLIENT_ID set: ${!!process.env.AUTH0_MGMT_CLIENT_ID}, MGMT_SECRET set: ${!!process.env.AUTH0_MGMT_CLIENT_SECRET}`);

            try {
                auth0User = await auth0.getUserByEmail(email);
                context.log(`[ShareDossier] Auth0 lookup result: ${auth0User ? 'User found' : 'User not found'}`);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                const errorStack = err instanceof Error ? err.stack : undefined;
                context.error('[ShareDossier] Auth0 lookup failed:', {
                    message: errorMessage,
                    stack: errorStack,
                    email: email,
                    domain: process.env.AUTH0_DOMAIN
                });
                return createErrorResponse(`Fout bij controleren gebruiker: ${errorMessage}`, 500);
            }

            // Create user in our DB (with or without auth0_id)
            gebruiker = await userRepo.create(
                email,
                auth0User ? auth0User.user_id : null
            );

            // If not in Auth0, invite them
            if (!auth0User) {
                try {
                    await auth0.inviteUser(email);
                    isNewUser = true;
                    context.log(`Invited new user: ${email}`);
                } catch (err) {
                    context.error('Failed to invite user:', err);
                    return createErrorResponse('Fout bij uitnodigen gebruiker', 500);
                }
            }
        }

        // 6. Check if already shared
        const alreadyShared = await shareRepo.isAlreadyShared(dossierId, gebruiker.id);
        if (alreadyShared) {
            return createErrorResponse('Dossier is al gedeeld met deze gebruiker', 400);
        }

        // 7. Share dossier
        await shareRepo.create(dossierId, gebruiker.id);

        return createSuccessResponse({
            message: isNewUser
                ? 'Uitnodiging verstuurd naar nieuwe gebruiker'
                : 'Dossier gedeeld met gebruiker'
        }, 201);

    } catch (error) {
        context.error('Error sharing dossier:', error);
        return error instanceof Error && error.message.includes('Unauthorized')
            ? createUnauthorizedResponse()
            : createErrorResponse('Fout bij delen dossier', 500);
    }
}

app.http('shareDossier', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{id}/delen',
    handler: shareDossier
});
