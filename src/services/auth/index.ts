import { DatabaseService } from '../database.service';
import { JwtValidator } from './jwt-validator';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { auth0Config } from '../../config/auth0.config';

let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
    if (!authServiceInstance) {
        const db = new DatabaseService();
        const jwtValidator = new JwtValidator(auth0Config);
        const userService = new UserService(db);
        
        authServiceInstance = new AuthService(
            jwtValidator,
            userService,
            {
                skipAuth: auth0Config.skipAuth,
                devUserId: auth0Config.devUserId
            }
        );
    }
    
    return authServiceInstance;
}

export { AuthService, AuthResult } from './auth.service';
export { User } from './user.service';
export { JwtValidator, ValidationResult } from './jwt-validator';