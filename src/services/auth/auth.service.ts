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
            console.log('Auth skipped - development mode');
            return this.handleDevelopmentAuth();
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            console.log('No authorization header found');
            return {
                authenticated: false,
                error: 'No authorization header'
            };
        }

        console.log('Authorization header found, processing...');
        return this.handleBearerAuth(authHeader);
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
            console.log('Invalid authorization format - does not start with Bearer');
            return {
                authenticated: false,
                error: 'Invalid authorization format'
            };
        }

        const token = authHeader.substring(7);
        console.log('Validating JWT token...');
        const validation = await this.jwtValidator.validateToken(token);

        if (!validation.isValid) {
            console.log('JWT validation failed:', validation.error);
            return {
                authenticated: false,
                error: validation.error
            };
        }

        console.log('JWT validated successfully. User ID from token:', validation.userId);
        console.log('Token payload:', JSON.stringify(validation.payload, null, 2));
        
        try {
            const user = await this.userService.findOrCreateUser({
                sub: validation.userId!,
                email: validation.payload.email,
                name: validation.payload.name
            });

            console.log('User found/created:', user.id, user.auth0Id);
            return {
                authenticated: true,
                userId: user.id,
                auth0Id: user.auth0Id,
                user
            };
        } catch (error) {
            console.error('Error finding/creating user:', error);
            console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
            return {
                authenticated: false,
                error: `Failed to find or create user: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
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