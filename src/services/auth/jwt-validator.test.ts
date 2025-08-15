import { JwtValidator } from './jwt-validator';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

jest.mock('jwks-rsa');

describe('JwtValidator', () => {
    let validator: JwtValidator;
    let mockJwksClient: jest.Mocked<JwksClient>;

    const mockConfig = {
        domain: 'test.auth0.com',
        audience: 'https://api.test.com',
        issuer: 'https://test.auth0.com/',
        algorithms: ['RS256'] as const,
        jwksUri: 'https://test.auth0.com/.well-known/jwks.json'
    };

    const validToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2V5In0.eyJzdWIiOiJhdXRoMHwxMjM0NTYiLCJhdWQiOiJodHRwczovL2FwaS50ZXN0LmNvbSIsImlzcyI6Imh0dHBzOi8vdGVzdC5hdXRoMC5jb20vIiwiZXhwIjoxNzU1MjU1MjA3LCJpYXQiOjE3NTUyNTE2MDd9.signature';
    const mockDecodedToken = {
        sub: 'auth0|123456',
        aud: 'https://api.test.com',
        iss: 'https://test.auth0.com/',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
    };

    beforeEach(() => {
        mockJwksClient = {
            getSigningKey: jest.fn()
        } as any;
        (JwksClient as jest.Mock).mockReturnValue(mockJwksClient);
        validator = new JwtValidator(mockConfig);
    });

    describe('validateToken', () => {
        it('should validate a valid token successfully', async () => {
            const mockSigningKey = { publicKey: 'mock-public-key' };
            (mockJwksClient.getSigningKey as jest.Mock).mockResolvedValue(mockSigningKey);
            
            jest.spyOn(jwt, 'decode').mockReturnValue({ header: { kid: 'test-key' }, payload: mockDecodedToken });
            jest.spyOn(jwt, 'verify').mockImplementation(() => mockDecodedToken);

            const result = await validator.validateToken(validToken);

            expect(result).toEqual({
                isValid: true,
                payload: mockDecodedToken,
                userId: 'auth0|123456'
            });
        });

        it('should return invalid for expired token', async () => {
            jest.spyOn(jwt, 'verify').mockImplementation(() => {
                throw new jwt.TokenExpiredError('Token expired', new Date());
            });

            const result = await validator.validateToken(validToken);

            expect(result).toEqual({
                isValid: false,
                error: 'Token expired'
            });
        });

        it('should return invalid for wrong audience', async () => {
            const wrongAudience = { ...mockDecodedToken, aud: 'wrong-audience' };
            const mockSigningKey = { publicKey: 'mock-public-key' };
            (mockJwksClient.getSigningKey as jest.Mock).mockResolvedValue(mockSigningKey);
            
            jest.spyOn(jwt, 'decode').mockReturnValue({ header: { kid: 'test-key' }, payload: wrongAudience });
            jest.spyOn(jwt, 'verify').mockImplementation(() => wrongAudience);

            const result = await validator.validateToken(validToken);

            expect(result).toEqual({
                isValid: false,
                error: 'Invalid audience'
            });
        });

        it('should return invalid for malformed token', async () => {
            const result = await validator.validateToken('invalid-token');

            expect(result).toEqual({
                isValid: false,
                error: 'Invalid token format'
            });
        });

        it('should handle missing token', async () => {
            const result = await validator.validateToken('');

            expect(result).toEqual({
                isValid: false,
                error: 'No token provided'
            });
        });
    });

    describe('extractUserId', () => {
        it('should extract user ID from valid payload', () => {
            const userId = validator.extractUserId(mockDecodedToken);
            expect(userId).toBe('auth0|123456');
        });

        it('should return null for missing sub claim', () => {
            const invalidPayload = { ...mockDecodedToken, sub: undefined };
            const userId = validator.extractUserId(invalidPayload);
            expect(userId).toBeNull();
        });
    });
});