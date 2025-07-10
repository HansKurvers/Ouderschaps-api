import { HttpRequest } from '@azure/functions';

export function getUserIdFromRequest(request: HttpRequest): string | null {
    const userId = request.headers.get('x-user-id');
    return userId || null;
}

export function getUserId(request: HttpRequest): number | null {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        return null;
    }
    const numericUserId = parseInt(userId, 10);
    return isNaN(numericUserId) ? null : numericUserId;
}

export function requireAuthentication(request: HttpRequest): string {
    // Skip authentication in development mode
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true') {
        // Return a default user ID for development
        return process.env.DEV_USER_ID || '1';
    }
    
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        throw new Error('Unauthorized: Missing x-user-id header');
    }
    return userId;
}