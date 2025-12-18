import { HttpRequest } from '@azure/functions';
import { DossierGastRepository } from '../repositories/DossierGastRepository';
import { DocumentAuditLogRepository } from '../repositories/DocumentAuditLogRepository';
import { DossierGast } from '../models/Dossier';

/**
 * Result of guest authentication attempt
 */
export interface GuestAuthResult {
    authenticated: boolean;
    gast?: DossierGast;
    error?: string;
}

/**
 * Extracts guest token from request
 *
 * Checks in order:
 * 1. Authorization header: Bearer <token>
 * 2. X-Guest-Token header
 * 3. Query parameter: ?token=<token>
 *
 * @param request - HTTP request
 * @returns Token string or null
 */
export function extractGuestToken(request: HttpRequest): string | null {
    // Check Authorization header (Bearer token format)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check X-Guest-Token header
    const guestTokenHeader = request.headers.get('x-guest-token');
    if (guestTokenHeader) {
        return guestTokenHeader;
    }

    // Check query parameter
    const tokenParam = request.query.get('token');
    if (tokenParam) {
        return tokenParam;
    }

    return null;
}

/**
 * Extracts client IP address from request
 *
 * @param request - HTTP request
 * @returns IP address or undefined
 */
export function extractClientIp(request: HttpRequest): string | undefined {
    // Azure Functions headers for client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        // Take the first IP if multiple are provided
        return forwardedFor.split(',')[0].trim();
    }

    const clientIp = request.headers.get('x-client-ip');
    if (clientIp) {
        return clientIp;
    }

    return undefined;
}

/**
 * Extracts user agent from request
 *
 * @param request - HTTP request
 * @returns User agent string or undefined
 */
export function extractUserAgent(request: HttpRequest): string | undefined {
    return request.headers.get('user-agent') || undefined;
}

/**
 * Authenticates a guest using their access token
 *
 * Validates token and checks:
 * - Token exists and is valid
 * - Token has not been revoked
 * - Token has not expired
 *
 * Also records access in audit log.
 *
 * @param request - HTTP request
 * @returns Authentication result with guest data if successful
 */
export async function authenticateGuest(request: HttpRequest): Promise<GuestAuthResult> {
    const token = extractGuestToken(request);

    if (!token) {
        return {
            authenticated: false,
            error: 'No guest token provided',
        };
    }

    // Validate token format (should be 64 character hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
        return {
            authenticated: false,
            error: 'Invalid token format',
        };
    }

    const gastRepository = new DossierGastRepository();
    const gast = await gastRepository.findByToken(token);

    if (!gast) {
        // Log failed access attempt
        const auditRepo = new DocumentAuditLogRepository();
        await auditRepo.logAccessDenied(
            undefined,
            extractClientIp(request),
            extractUserAgent(request),
            { reason: 'Invalid or expired token' }
        );

        return {
            authenticated: false,
            error: 'Invalid or expired token',
        };
    }

    // Update last access and record first access if needed
    await gastRepository.recordFirstAccess(gast.id);

    // Log successful guest access
    const auditRepo = new DocumentAuditLogRepository();
    await auditRepo.logGuestAccess(
        gast.dossierId,
        gast.id,
        extractClientIp(request),
        extractUserAgent(request)
    );

    return {
        authenticated: true,
        gast,
    };
}

/**
 * Requires guest authentication - throws error if not authenticated
 *
 * @param request - HTTP request
 * @returns Authenticated guest data
 * @throws Error if authentication fails
 */
export async function requireGuestAuthentication(request: HttpRequest): Promise<DossierGast> {
    const result = await authenticateGuest(request);

    if (!result.authenticated || !result.gast) {
        throw new Error(result.error || 'Guest authentication failed');
    }

    return result.gast;
}

/**
 * Checks if guest has specific permission
 *
 * @param gast - Guest data
 * @param permission - Required permission
 * @returns True if guest has permission
 */
export function guestHasPermission(gast: DossierGast, permission: 'upload' | 'view'): boolean {
    switch (gast.rechten) {
        case 'upload_view':
            return true;
        case 'upload':
            return permission === 'upload';
        case 'view':
            return permission === 'view';
        default:
            return false;
    }
}

/**
 * Requires guest to have specific permission
 *
 * @param gast - Guest data
 * @param permission - Required permission
 * @throws Error if guest lacks permission
 */
export function requireGuestPermission(gast: DossierGast, permission: 'upload' | 'view'): void {
    if (!guestHasPermission(gast, permission)) {
        throw new Error(`Guest lacks required permission: ${permission}`);
    }
}

/**
 * Combined authentication that accepts either user or guest
 *
 * Use this for endpoints that should work for both authenticated users
 * and guests with valid tokens.
 *
 * @param request - HTTP request
 * @returns Authentication result with either userId or gast
 */
export interface CombinedAuthResult {
    authenticated: boolean;
    type: 'user' | 'guest' | 'none';
    userId?: number;
    gast?: DossierGast;
    error?: string;
}

export async function authenticateUserOrGuest(request: HttpRequest): Promise<CombinedAuthResult> {
    // First, try to check for guest token (cheaper, no external calls)
    const guestToken = extractGuestToken(request);

    if (guestToken) {
        const guestResult = await authenticateGuest(request);
        if (guestResult.authenticated && guestResult.gast) {
            return {
                authenticated: true,
                type: 'guest',
                gast: guestResult.gast,
            };
        }
    }

    // If no guest token or guest auth failed, try user auth
    const { getAuthService } = await import('../services/auth');
    const authService = getAuthService();
    const userResult = await authService.authenticateRequest(request);

    if (userResult.authenticated && userResult.userId) {
        return {
            authenticated: true,
            type: 'user',
            userId: userResult.userId,
        };
    }

    return {
        authenticated: false,
        type: 'none',
        error: 'No valid authentication provided',
    };
}

/**
 * Verifies that a guest has access to a specific dossier
 *
 * SECURITY: This is critical for preventing cross-dossier access
 *
 * @param gast - Guest data
 * @param dossierId - Dossier ID to check access for
 * @returns True if guest has access to the dossier
 */
export function guestHasDossierAccess(gast: DossierGast, dossierId: number): boolean {
    // Guests can ONLY access their own dossier
    return gast.dossierId === dossierId;
}

/**
 * Requires guest to have access to a specific dossier
 *
 * @param gast - Guest data
 * @param dossierId - Dossier ID to check access for
 * @throws Error if guest lacks access
 */
export function requireGuestDossierAccess(gast: DossierGast, dossierId: number): void {
    if (!guestHasDossierAccess(gast, dossierId)) {
        throw new Error('Guest does not have access to this dossier');
    }
}
