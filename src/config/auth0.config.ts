import { config } from 'dotenv';

config();

export const auth0Config = {
    domain: process.env.AUTH0_DOMAIN || '',
    audience: process.env.AUTH0_AUDIENCE || '',
    issuer: process.env.AUTH0_ISSUER || `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256'] as const,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    
    // Development settings
    skipAuth: process.env.SKIP_AUTH === 'true' || process.env.NODE_ENV === 'development',
    devUserId: parseInt(process.env.DEV_USER_ID || '1', 10)
};

export function validateAuth0Config(): void {
    if (auth0Config.skipAuth) {
        console.warn('⚠️  Auth0 authentication is disabled in development mode');
        return;
    }

    if (!auth0Config.domain) {
        throw new Error('AUTH0_DOMAIN environment variable is required');
    }
    
    if (!auth0Config.audience) {
        throw new Error('AUTH0_AUDIENCE environment variable is required');
    }
}