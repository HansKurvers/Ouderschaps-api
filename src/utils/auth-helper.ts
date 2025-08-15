import { HttpRequest } from '@azure/functions';
import { getAuthService } from '../services/auth';

/**
 * @deprecated Use getAuthService().authenticateRequest() instead
 */
export function getUserIdFromRequest(request: HttpRequest): string | null {
    const userId = request.headers.get('x-user-id');
    return userId || null;
}

/**
 * @deprecated Use getAuthService().authenticateRequest() instead
 */
export function getUserId(request: HttpRequest): number | null {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        return null;
    }
    const numericUserId = parseInt(userId, 10);
    return isNaN(numericUserId) ? null : numericUserId;
}

/**
 * Authenticates request and returns user ID
 * Supports both Auth0 JWT tokens and legacy x-user-id header
 */
export async function requireAuthentication(request: HttpRequest): Promise<number> {
    const authService = getAuthService();
    const user = await authService.requireAuthentication(request);
    return user.id;
}

/**
 * Gets authenticated user ID without throwing errors
 */
export async function getAuthenticatedUserId(request: HttpRequest): Promise<number | null> {
    const authService = getAuthService();
    const result = await authService.authenticateRequest(request);
    
    if (result.authenticated && result.userId) {
        return result.userId;
    }
    
    return null;
}