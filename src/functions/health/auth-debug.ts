import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { auth0Config } from '../../config/auth0.config';
import jwt from 'jsonwebtoken';

export async function authDebug(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('Auth debug endpoint called');

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
        return {
            status: 200,
            body: JSON.stringify({
                error: 'No Authorization header provided',
                help: 'Send a request with Authorization: Bearer <token>',
                backendExpects: {
                    audience: auth0Config.audience,
                    issuer: auth0Config.issuer,
                    domain: auth0Config.domain
                }
            }, null, 2),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    if (!authHeader.startsWith('Bearer ')) {
        return {
            status: 200,
            body: JSON.stringify({
                error: 'Authorization header must start with "Bearer "',
                received: authHeader.substring(0, 20) + '...'
            }, null, 2),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    const token = authHeader.substring(7);

    try {
        // Decode without verification to see what's in the token
        const decoded = jwt.decode(token, { complete: true });
        
        if (!decoded) {
            return {
                status: 200,
                body: JSON.stringify({
                    error: 'Could not decode token',
                    tokenStart: token.substring(0, 50) + '...'
                }, null, 2),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const payload = decoded.payload as any;
        
        // Check what's different
        const audienceMatch = payload.aud === auth0Config.audience || 
                            (Array.isArray(payload.aud) && payload.aud.includes(auth0Config.audience));
        const issuerMatch = payload.iss === auth0Config.issuer;
        const domainInIssuer = payload.iss?.includes(auth0Config.domain);
        
        const now = Math.floor(Date.now() / 1000);
        const expired = payload.exp < now;

        return {
            status: 200,
            body: JSON.stringify({
                tokenAnalysis: {
                    header: decoded.header,
                    payload: {
                        iss: payload.iss,
                        aud: payload.aud,
                        sub: payload.sub,
                        exp: payload.exp,
                        iat: payload.iat,
                        expiresAt: new Date(payload.exp * 1000).toISOString(),
                        issuedAt: new Date(payload.iat * 1000).toISOString()
                    }
                },
                backendExpects: {
                    audience: auth0Config.audience,
                    issuer: auth0Config.issuer,
                    domain: auth0Config.domain,
                    jwksUri: auth0Config.jwksUri
                },
                validation: {
                    audienceMatch,
                    issuerMatch,
                    domainInIssuer,
                    expired,
                    audienceDetails: !audienceMatch ? {
                        expected: auth0Config.audience,
                        received: payload.aud
                    } : null,
                    issuerDetails: !issuerMatch ? {
                        expected: auth0Config.issuer,
                        received: payload.iss
                    } : null
                },
                willAuthenticate: audienceMatch && issuerMatch && !expired
            }, null, 2),
            headers: { 'Content-Type': 'application/json' }
        };
    } catch (error) {
        return {
            status: 200,
            body: JSON.stringify({
                error: 'Error processing token',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2),
            headers: { 'Content-Type': 'application/json' }
        };
    }
}

app.http('authDebug', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'health/auth-debug',
    handler: authDebug,
});