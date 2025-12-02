/**
 * Auth0 Invite Service - SIMPLIFIED
 *
 * Uses Auth0's password-change ticket for invitations.
 * Auth0 handles everything: user creation, email sending, password setup UI.
 */

import crypto from 'crypto';

interface Auth0User {
    user_id: string;
    email: string;
    email_verified: boolean;
}

interface ManagementToken {
    access_token: string;
    expires_in: number;
}


export class Auth0InviteService {
    // Management API domain - must be the tenant domain, NOT custom domain
    // Custom domains (like login.idocx.nl) don't work with Management API
    private mgmtDomain: string;
    private mgmtClientId: string;
    private mgmtClientSecret: string;
    private appClientId: string;
    private cachedToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        // Use AUTH0_MGMT_DOMAIN for Management API, fallback to AUTH0_DOMAIN
        // IMPORTANT: Management API requires the tenant domain (xxx.eu.auth0.com),
        // not the custom domain (login.idocx.nl)
        this.mgmtDomain = process.env.AUTH0_MGMT_DOMAIN || process.env.AUTH0_DOMAIN || '';
        this.mgmtClientId = process.env.AUTH0_MGMT_CLIENT_ID || '';
        this.mgmtClientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET || '';
        this.appClientId = process.env.AUTH0_CLIENT_ID || '';

        // Log configuration for debugging
        console.log('[Auth0InviteService] Initialized with:', {
            mgmtDomain: this.mgmtDomain,
            mgmtClientIdSet: !!this.mgmtClientId,
            mgmtSecretSet: !!this.mgmtClientSecret,
            appClientIdSet: !!this.appClientId
        });

        // Warn if using custom domain for Management API (won't work!)
        if (this.mgmtDomain && !this.mgmtDomain.includes('.auth0.com')) {
            console.warn(`⚠️  AUTH0_MGMT_DOMAIN="${this.mgmtDomain}" looks like a custom domain. Management API requires tenant domain (xxx.auth0.com). Set AUTH0_MGMT_DOMAIN to your tenant domain.`);
        }

        if (!this.mgmtDomain) console.warn('⚠️  AUTH0_MGMT_DOMAIN not set');
        if (!this.mgmtClientId) console.warn('⚠️  AUTH0_MGMT_CLIENT_ID not set');
        if (!this.mgmtClientSecret) console.warn('⚠️  AUTH0_MGMT_CLIENT_SECRET not set');
        if (!this.appClientId) console.warn('⚠️  AUTH0_CLIENT_ID not set');
    }

    /**
     * Get M2M token for Management API (cached)
     */
    private async getToken(): Promise<string> {
        if (this.cachedToken && Date.now() < this.tokenExpiry) {
            console.log('[Auth0InviteService] Using cached token');
            return this.cachedToken;
        }

        // Validate required credentials
        if (!this.mgmtDomain || !this.mgmtClientId || !this.mgmtClientSecret) {
            const missing = [];
            if (!this.mgmtDomain) missing.push('AUTH0_MGMT_DOMAIN');
            if (!this.mgmtClientId) missing.push('AUTH0_MGMT_CLIENT_ID');
            if (!this.mgmtClientSecret) missing.push('AUTH0_MGMT_CLIENT_SECRET');
            console.error('[Auth0InviteService] Missing credentials:', missing);
            throw new Error(`Missing Auth0 credentials: ${missing.join(', ')}`);
        }

        const tokenUrl = `https://${this.mgmtDomain}/oauth/token`;
        const audience = `https://${this.mgmtDomain}/api/v2/`;

        console.log('[Auth0InviteService] Requesting M2M token:', {
            url: tokenUrl,
            audience: audience,
            clientIdLength: this.mgmtClientId.length,
            secretLength: this.mgmtClientSecret.length
        });

        const tokenPayload = {
            client_id: this.mgmtClientId,
            client_secret: this.mgmtClientSecret,
            audience: audience,
            grant_type: 'client_credentials'
        };

        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tokenPayload)
            });

            const responseText = await response.text();
            console.log('[Auth0InviteService] Token response status:', response.status);

            if (!response.ok) {
                console.error('[Auth0InviteService] Token request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: responseText
                });
                throw new Error(`Failed to get Auth0 token: ${response.status} - ${responseText}`);
            }

            const data: ManagementToken = JSON.parse(responseText);
            this.cachedToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in - 3600) * 1000;

            console.log('[Auth0InviteService] Got M2M token, expires in', data.expires_in, 'seconds');

            return this.cachedToken;
        } catch (error) {
            console.error('[Auth0InviteService] Token request exception:', error);
            throw error;
        }
    }

    /**
     * Check if user exists in Auth0
     */
    async getUserByEmail(email: string): Promise<Auth0User | null> {
        console.log('[Auth0InviteService] getUserByEmail called for:', email);

        const token = await this.getToken();

        const searchUrl = `https://${this.mgmtDomain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`;
        console.log('[Auth0InviteService] Searching users at:', searchUrl);

        try {
            const response = await fetch(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const responseText = await response.text();
            console.log('[Auth0InviteService] Search response status:', response.status);

            if (!response.ok) {
                console.error('[Auth0InviteService] Search failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: responseText
                });
                throw new Error(`Failed to search Auth0 users: ${response.status} - ${responseText}`);
            }

            const users: Auth0User[] = JSON.parse(responseText);
            console.log('[Auth0InviteService] Found', users.length, 'users');

            return users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('[Auth0InviteService] getUserByEmail exception:', error);
            throw error;
        }
    }

    /**
     * Invite user: create account + send password setup email
     * Auth0 sends the email automatically via password-change ticket!
     */
    async inviteUser(email: string): Promise<void> {
        const token = await this.getToken();

        // 1. Create user with random password (email_verified=false)
        const password = crypto.randomBytes(16).toString('base64');

        const createResp = await fetch(`https://${this.mgmtDomain}/api/v2/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                connection: 'Username-Password-Authentication',
                email_verified: false
            })
        });

        if (!createResp.ok) {
            const error = await createResp.text();
            throw new Error(`Failed to create Auth0 user: ${createResp.status} - ${error}`);
        }

        const user: Auth0User = await createResp.json();

        // 2. Create password-change ticket → Auth0 sends invite email!
        const ticketResp = await fetch(`https://${this.mgmtDomain}/api/v2/tickets/password-change`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: user.user_id,
                client_id: this.appClientId,
                ttl_sec: 604800, // 7 days
                mark_email_as_verified: true,
                includeEmailInRedirect: true
            })
        });

        if (!ticketResp.ok) {
            const error = await ticketResp.text();
            throw new Error(`Failed to create password-change ticket: ${ticketResp.status} - ${error}`);
        }

        // Ticket created → Auth0 automatically sends email!
    }
}
