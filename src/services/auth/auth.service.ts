import { HttpRequest } from '@azure/functions';
import { JwtValidator } from './jwt-validator';
import { UserService, User } from './user.service';

export interface AuthConfig {
    skipAuth: boolean;
    devUserId: number;
}

export interface AuthResult {
    authenticated: boolean;
    userId?: number;
    auth0Id?: string;
    user?: User;
    error?: string;
    legacy?: boolean;
    development?: boolean;
}

export class AuthService {
    constructor(
        private jwtValidator: JwtValidator,
        private userService: UserService,
        private config: AuthConfig
    ) {}

    async authenticateRequest(request: HttpRequest): Promise<AuthResult> {
        if (this.config.skipAuth) {
            return this.handleDevelopmentAuth();
        }

        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            return this.handleBearerAuth(authHeader);
        }

        const userIdHeader = request.headers.get('x-user-id');
        if (userIdHeader) {
            return this.handleLegacyAuth(userIdHeader);
        }

        return {
            authenticated: false,
            error: 'No authorization header'
        };
    }

    async requireAuthentication(request: HttpRequest): Promise<User> {
        const result = await this.authenticateRequest(request);
        
        if (!result.authenticated || !result.user) {
            throw new Error(`Authentication required: ${result.error || 'Unknown error'}`);
        }

        return result.user;
    }

    private async handleBearerAuth(authHeader: string): Promise<AuthResult> {
        if (!authHeader.startsWith('Bearer ')) {
            return {
                authenticated: false,
                error: 'Invalid authorization format'
            };
        }

        const token = authHeader.substring(7);
        const validation = await this.jwtValidator.validateToken(token);

        if (!validation.isValid) {
            return {
                authenticated: false,
                error: validation.error
            };
        }

        const user = await this.userService.findOrCreateUser({
            sub: validation.userId!,
            email: validation.payload.email,
            name: validation.payload.name
        });

        return {
            authenticated: true,
            userId: user.id,
            auth0Id: user.auth0Id,
            user
        };
    }

    private async handleLegacyAuth(userIdHeader: string): Promise<AuthResult> {
        const userId = parseInt(userIdHeader, 10);
        
        if (isNaN(userId)) {
            return {
                authenticated: false,
                error: 'Invalid user ID format'
            };
        }

        const user = await this.userService.getUserById(userId);
        
        if (!user) {
            return {
                authenticated: false,
                error: 'User not found'
            };
        }

        console.warn(`Legacy authentication used for user ${userId}. Please migrate to Auth0.`);

        return {
            authenticated: true,
            userId: user.id,
            auth0Id: user.auth0Id,
            user,
            legacy: true
        };
    }

    private async handleDevelopmentAuth(): Promise<AuthResult> {
        const user = await this.userService.getUserById(this.config.devUserId);
        
        if (!user) {
            return {
                authenticated: false,
                error: `Development user ${this.config.devUserId} not found`
            };
        }

        return {
            authenticated: true,
            userId: user.id,
            auth0Id: user.auth0Id,
            user,
            development: true
        };
    }
}