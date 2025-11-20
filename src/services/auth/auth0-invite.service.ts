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
    private domain: string;
    private mgmtClientId: string;
    private mgmtClientSecret: string;
    private appClientId: string;
    private cachedToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        this.domain = process.env.AUTH0_DOMAIN || '';
        this.mgmtClientId = process.env.AUTH0_MGMT_CLIENT_ID || '';
        this.mgmtClientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET || '';
        this.appClientId = process.env.AUTH0_CLIENT_ID || '';

        // Log missing credentials for debugging
        if (!this.domain) console.warn('⚠️  AUTH0_DOMAIN not set');
        if (!this.mgmtClientId) console.warn('⚠️  AUTH0_MGMT_CLIENT_ID not set');
        if (!this.mgmtClientSecret) console.warn('⚠️  AUTH0_MGMT_CLIENT_SECRET not set');
        if (!this.appClientId) console.warn('⚠️  AUTH0_CLIENT_ID not set');
    }

    /**
     * Get M2M token for Management API (cached)
     */
    private async getToken(): Promise<string> {
        if (this.cachedToken && Date.now() < this.tokenExpiry) {
            return this.cachedToken;
        }

        // Validate required credentials
        if (!this.domain || !this.mgmtClientId || !this.mgmtClientSecret) {
            const missing = [];
            if (!this.domain) missing.push('AUTH0_DOMAIN');
            if (!this.mgmtClientId) missing.push('AUTH0_MGMT_CLIENT_ID');
            if (!this.mgmtClientSecret) missing.push('AUTH0_MGMT_CLIENT_SECRET');
            throw new Error(`Missing Auth0 credentials: ${missing.join(', ')}`);
        }

        const tokenPayload = {
            client_id: this.mgmtClientId,
            client_secret: this.mgmtClientSecret,
            audience: `https://${this.domain}/api/v2/`,
            grant_type: 'client_credentials'
        };

        console.log('🔐 Requesting Auth0 M2M token with audience:', tokenPayload.audience);

        const response = await fetch(`https://${this.domain}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokenPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get Auth0 token: ${response.status} - ${errorText}`);
        }

        const data: ManagementToken = await response.json();
        this.cachedToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in - 3600) * 1000;

        console.log('✅ Got Auth0 M2M token, expires in', data.expires_in, 'seconds');

        return this.cachedToken;
    }

    /**
     * Check if user exists in Auth0
     */
    async getUserByEmail(email: string): Promise<Auth0User | null> {
        const token = await this.getToken();

        const response = await fetch(
            `https://${this.domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to search Auth0 users: ${response.status} - ${errorText}`);
        }

        const users: Auth0User[] = await response.json();
        return users.length > 0 ? users[0] : null;
    }

    /**
     * Invite user: create account + send password setup email
     * Auth0 sends the email automatically via password-change ticket!
     */
    async inviteUser(email: string): Promise<void> {
        const token = await this.getToken();

        // 1. Create user with random password (email_verified=false)
        const password = crypto.randomBytes(16).toString('base64');

        const createResp = await fetch(`https://${this.domain}/api/v2/users`, {
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
        const ticketResp = await fetch(`https://${this.domain}/api/v2/tickets/password-change`, {
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
