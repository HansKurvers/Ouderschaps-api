import { HttpRequest } from '@azure/functions';

export function getUserIdFromRequest(request: HttpRequest): string | null {
    const userId = request.headers.get('x-user-id');
    return userId || null;
}

export function requireAuthentication(request: HttpRequest): string {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        throw new Error('Unauthorized: Missing x-user-id header');
    }
    return userId;
}