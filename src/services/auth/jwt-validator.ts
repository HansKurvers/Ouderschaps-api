import jwt from 'jsonwebtoken';
import jwksRsa, { JwksClient } from 'jwks-rsa';

export interface JwtConfig {
    domain: string;
    audience: string;
    issuer: string;
    algorithms: readonly string[];
    jwksUri: string;
}

export interface ValidationResult {
    isValid: boolean;
    payload?: any;
    userId?: string;
    error?: string;
}

export class JwtValidator {
    private jwksClient: JwksClient;

    constructor(private config: JwtConfig) {
        this.jwksClient = jwksRsa({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
            jwksUri: config.jwksUri
        });
    }

    async validateToken(token: string): Promise<ValidationResult> {
        if (!token) {
            return { isValid: false, error: 'No token provided' };
        }

        if (!token.startsWith('eyJ')) {
            return { isValid: false, error: 'Invalid token format' };
        }

        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || !decoded.header.kid) {
                return { isValid: false, error: 'Invalid token format' };
            }


            const key = await this.getSigningKey(decoded.header.kid);
            
            const payload = jwt.verify(token, key, {
                audience: this.config.audience,
                issuer: this.config.issuer,
                algorithms: this.config.algorithms as jwt.Algorithm[]
            });

            // jwt.verify already checks the audience, no need for additional check
            // The audience can be a string or array, and jwt.verify handles both cases

            const userId = this.extractUserId(payload);
            return { 
                isValid: true, 
                payload, 
                userId: userId || undefined 
            };
        } catch (error) {
            console.error('Token validation error:', error);
            if (error instanceof jwt.TokenExpiredError) {
                return { isValid: false, error: 'Token expired' };
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return { isValid: false, error: 'Invalid token: ' + error.message };
            }
            return { isValid: false, error: 'Token validation failed: ' + (error as Error).message };
        }
    }

    extractUserId(payload: any): string | null {
        return payload?.sub || null;
    }

    private async getSigningKey(kid: string): Promise<string> {
        const key = await this.jwksClient.getSigningKey(kid);
        return 'publicKey' in key ? key.publicKey : key.rsaPublicKey;
    }
}