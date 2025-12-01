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
        context.log(`[ShareDossier] Step 5: Looking up user by email: ${email}`);
        const userRepo = new GebruikerRepository();
        const auth0 = new Auth0InviteService();
        let gebruiker;
        let isNewUser = false;
        let needsAuth0Invite = false;

        // First check Auth0 to get the auth0_id if user exists there
        context.log(`[ShareDossier] Checking Auth0 for email: ${email}`);
        context.log(`[ShareDossier] Auth0 config - MGMT_DOMAIN: ${process.env.AUTH0_MGMT_DOMAIN || '(using AUTH0_DOMAIN: ' + process.env.AUTH0_DOMAIN + ')'}, MGMT_CLIENT_ID set: ${!!process.env.AUTH0_MGMT_CLIENT_ID}, MGMT_SECRET set: ${!!process.env.AUTH0_MGMT_CLIENT_SECRET}`);

        let auth0User;
        try {
            auth0User = await auth0.getUserByEmail(email);
            context.log(`[ShareDossier] Auth0 lookup result: ${auth0User ? `Found with ID ${auth0User.user_id}` : 'User not found in Auth0'}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            context.error('[ShareDossier] Auth0 lookup failed:', { message: errorMessage, email });
            return createErrorResponse(`Fout bij controleren gebruiker in Auth0: ${errorMessage}`, 500);
        }

        // Now find or create user in our database
        try {
            const result = await userRepo.findOrCreate(email, auth0User?.user_id || null);
            gebruiker = result.gebruiker;
            isNewUser = result.isNew;
            context.log(`[ShareDossier] findOrCreate result: ${isNewUser ? 'Created new' : 'Found existing'} user ID ${gebruiker.id}`);
        } catch (err) {
            context.error('[ShareDossier] findOrCreate failed:', err);
            return createErrorResponse(`Fout bij zoeken/aanmaken gebruiker: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
        }

        // If user is new in our DB AND not in Auth0, we need to invite them
        if (isNewUser && !auth0User) {
            needsAuth0Invite = true;
            context.log(`[ShareDossier] User needs Auth0 invite`);
            try {
                await auth0.inviteUser(email);
                context.log(`[ShareDossier] Invited new user: ${email}`);
            } catch (err) {
                context.error('[ShareDossier] Failed to invite user:', err);
                return createErrorResponse(`Fout bij uitnodigen gebruiker: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
            }
        }

        // 6. Check if already shared
        context.log(`[ShareDossier] Step 6: Checking if already shared - dossierId: ${dossierId}, gebruikerId: ${gebruiker.id}`);
        let alreadyShared;
        try {
            alreadyShared = await shareRepo.isAlreadyShared(dossierId, gebruiker.id);
            context.log(`[ShareDossier] isAlreadyShared result: ${alreadyShared}`);
        } catch (err) {
            context.error('[ShareDossier] isAlreadyShared failed:', err);
            return createErrorResponse(`Fout bij controleren bestaande deling: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
        }
        if (alreadyShared) {
            return createErrorResponse('Dossier is al gedeeld met deze gebruiker', 400);
        }

        // 7. Share dossier
        context.log(`[ShareDossier] Step 7: Creating share - dossierId: ${dossierId}, gebruikerId: ${gebruiker.id}`);
        try {
            await shareRepo.create(dossierId, gebruiker.id);
            context.log(`[ShareDossier] Share created successfully`);
        } catch (err) {
            context.error('[ShareDossier] shareRepo.create failed:', err);
            return createErrorResponse(`Fout bij opslaan deling: ${err instanceof Error ? err.message : 'Unknown'}`, 500);
        }

        return createSuccessResponse({
            message: needsAuth0Invite
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
