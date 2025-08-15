import { AuthService } from './auth.service';
import { JwtValidator } from './jwt-validator';
import { UserService } from './user.service';
import { HttpRequest } from '@azure/functions';

jest.mock('./jwt-validator');
jest.mock('./user.service');

describe('AuthService', () => {
    let authService: AuthService;
    let mockJwtValidator: jest.Mocked<JwtValidator>;
    let mockUserService: jest.Mocked<UserService>;

    const mockConfig = {
        skipAuth: false,
        devUserId: 1
    };

    beforeEach(() => {
        mockJwtValidator = new JwtValidator({} as any) as jest.Mocked<JwtValidator>;
        mockUserService = new UserService({} as any) as jest.Mocked<UserService>;
        authService = new AuthService(mockJwtValidator, mockUserService, mockConfig);
    });

    describe('authenticateRequest', () => {
        const mockRequest = {
            headers: {
                get: jest.fn((key: string) => key === 'authorization' ? 'Bearer valid-token' : null)
            }
        } as unknown as HttpRequest;

        it('should authenticate valid token and return user', async () => {
            mockJwtValidator.validateToken.mockResolvedValue({
                isValid: true,
                payload: {
                    sub: 'auth0|123456',
                    email: 'test@example.com',
                    name: 'Test User'
                },
                userId: 'auth0|123456'
            });

            mockUserService.findOrCreateUser.mockResolvedValue({
                id: 42,
                auth0Id: 'auth0|123456',
                email: 'test@example.com',
                naam: 'Test User'
            });

            const result = await authService.authenticateRequest(mockRequest);

            expect(result).toEqual({
                authenticated: true,
                userId: 42,
                auth0Id: 'auth0|123456',
                user: {
                    id: 42,
                    auth0Id: 'auth0|123456',
                    email: 'test@example.com',
                    naam: 'Test User'
                }
            });
        });

        it('should reject invalid token', async () => {
            mockJwtValidator.validateToken.mockResolvedValue({
                isValid: false,
                error: 'Token expired'
            });

            const result = await authService.authenticateRequest(mockRequest);

            expect(result).toEqual({
                authenticated: false,
                error: 'Token expired'
            });
            expect(mockUserService.findOrCreateUser).not.toHaveBeenCalled();
        });

        it('should handle missing authorization header', async () => {
            const requestNoAuth = {
                headers: {
                    get: jest.fn(() => null)
                }
            } as unknown as HttpRequest;

            const result = await authService.authenticateRequest(requestNoAuth);

            expect(result).toEqual({
                authenticated: false,
                error: 'No authorization header'
            });
        });

        it('should handle malformed authorization header', async () => {
            const requestBadAuth = {
                headers: {
                    get: jest.fn((key: string) => key === 'authorization' ? 'NotBearer token' : null)
                }
            } as unknown as HttpRequest;

            const result = await authService.authenticateRequest(requestBadAuth);

            expect(result).toEqual({
                authenticated: false,
                error: 'Invalid authorization format'
            });
        });

        it('should support backward compatibility with x-user-id header', async () => {
            const requestWithUserId = {
                headers: {
                    get: jest.fn((key: string) => key === 'x-user-id' ? '42' : null)
                }
            } as unknown as HttpRequest;

            mockUserService.getUserById.mockResolvedValue({
                id: 42,
                auth0Id: 'auth0|legacy',
                email: 'legacy@example.com',
                naam: 'Legacy User'
            });

            const result = await authService.authenticateRequest(requestWithUserId);

            expect(result).toEqual({
                authenticated: true,
                userId: 42,
                auth0Id: 'auth0|legacy',
                user: {
                    id: 42,
                    auth0Id: 'auth0|legacy',
                    email: 'legacy@example.com',
                    naam: 'Legacy User'
                },
                legacy: true
            });
        });

        it('should skip auth in development mode', async () => {
            const devConfig = { skipAuth: true, devUserId: 99 };
            const devAuthService = new AuthService(mockJwtValidator, mockUserService, devConfig);

            mockUserService.getUserById.mockResolvedValue({
                id: 99,
                auth0Id: 'auth0|dev',
                email: 'dev@example.com',
                naam: 'Dev User'
            });

            const result = await devAuthService.authenticateRequest({} as HttpRequest);

            expect(result).toEqual({
                authenticated: true,
                userId: 99,
                auth0Id: 'auth0|dev',
                user: {
                    id: 99,
                    auth0Id: 'auth0|dev',
                    email: 'dev@example.com',
                    naam: 'Dev User'
                },
                development: true
            });
        });
    });

    describe('requireAuthentication', () => {
        it('should return user for authenticated request', async () => {
            const authResult = {
                authenticated: true,
                userId: 42,
                auth0Id: 'auth0|123456',
                user: { id: 42, auth0Id: 'auth0|123456', email: 'test@example.com', naam: 'Test User' }
            };

            jest.spyOn(authService, 'authenticateRequest').mockResolvedValue(authResult);

            const result = await authService.requireAuthentication({} as HttpRequest);

            expect(result).toEqual(authResult.user);
        });

        it('should throw error for unauthenticated request', async () => {
            const authResult = {
                authenticated: false,
                error: 'Invalid token'
            };

            jest.spyOn(authService, 'authenticateRequest').mockResolvedValue(authResult);

            await expect(authService.requireAuthentication({} as HttpRequest))
                .rejects.toThrow('Authentication required: Invalid token');
        });
    });
});