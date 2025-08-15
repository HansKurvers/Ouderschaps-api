import { HttpRequest } from '@azure/functions';
import { getAuthService } from '../services/auth';

/**
 * Authenticates request and returns user ID
 * Supports Auth0 JWT tokens in Authorization header
 * In development mode (SKIP_AUTH=true), uses default user
 */
export async function requireAuthentication(request: HttpRequest): Promise<number> {
    const authService = getAuthService();
    const user = await authService.requireAuthentication(request);
    return user.id;
}

/**
 * Gets authenticated user ID without throwing errors
 * Returns null if authentication fails
 */
export async function getAuthenticatedUserId(request: HttpRequest): Promise<number | null> {
    const authService = getAuthService();
    const result = await authService.authenticateRequest(request);
    
    if (result.authenticated && result.userId) {
        return result.userId;
    }
    
    return null;
}