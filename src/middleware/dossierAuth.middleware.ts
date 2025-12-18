import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { DossierRepository } from '../repositories/DossierRepository';
import { DossierGastRepository } from '../repositories/DossierGastRepository';
import { DocumentAuditLogRepository } from '../repositories/DocumentAuditLogRepository';
import { extractClientIp, extractUserAgent, extractGuestToken } from '../utils/guest-auth-helper';

/**
 * Context object returned on successful dossier access verification
 */
export interface DossierAccessContext {
    type: 'owner' | 'shared' | 'guest';
    userId?: number;
    gastId?: number;
    gastEmail?: string;
    permissions: string[];
    dossierId: number;
}

/**
 * All possible permissions for dossier access
 */
export type DossierPermission = 'upload' | 'download' | 'delete' | 'view' | 'invite' | 'manage';

/**
 * Owner permissions - full access
 */
const OWNER_PERMISSIONS: DossierPermission[] = ['upload', 'download', 'delete', 'view', 'invite', 'manage'];

/**
 * Shared user permissions - same as owner except invite/manage
 */
const SHARED_PERMISSIONS: DossierPermission[] = ['upload', 'download', 'delete', 'view'];

/**
 * Middleware that verifies if the requester has access to a dossier.
 * Returns a context object on success, or an HTTP error response on failure.
 *
 * Supports three access types:
 * 1. Owner - User who created the dossier (full permissions)
 * 2. Shared - User with whom the dossier was shared (limited permissions)
 * 3. Guest - External party with token-based access (configurable permissions)
 *
 * @param request - The HTTP request
 * @param dossierId - The dossier ID to check access for
 * @returns DossierAccessContext on success, HttpResponseInit on failure
 *
 * @example
 * ```typescript
 * const accessResult = await verifyDossierAccess(request, dossierId);
 *
 * if ('status' in accessResult) {
 *     // Access denied - return the error response
 *     return accessResult;
 * }
 *
 * // Access granted - use the context
 * const context = accessResult;
 * if (hasPermission(context, 'upload')) {
 *     // Allow upload...
 * }
 * ```
 */
export async function verifyDossierAccess(
    request: HttpRequest,
    dossierId: number
): Promise<DossierAccessContext | HttpResponseInit> {
    const authHeader = request.headers.get('authorization');
    const guestToken = extractGuestToken(request);
    const clientIp = extractClientIp(request);
    const userAgent = extractUserAgent(request);

    const auditRepo = new DocumentAuditLogRepository();

    // Scenario 1: Authenticated user with JWT
    if (authHeader?.startsWith('Bearer ')) {
        try {
            // Use existing auth service to get user ID
            const { getAuthService } = await import('../services/auth');
            const authService = getAuthService();
            const authResult = await authService.authenticateRequest(request);

            if (authResult.authenticated && authResult.userId) {
                const userId = authResult.userId;
                const dossierRepo = new DossierRepository();

                // Check if user is owner
                const isOwner = await dossierRepo.isOwner(dossierId, userId);
                if (isOwner) {
                    return {
                        type: 'owner',
                        userId,
                        dossierId,
                        permissions: [...OWNER_PERMISSIONS],
                    };
                }

                // Check if user has shared access
                const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
                if (hasAccess) {
                    return {
                        type: 'shared',
                        userId,
                        dossierId,
                        permissions: [...SHARED_PERMISSIONS],
                    };
                }
            }
        } catch (error) {
            // Auth failed, continue to check guest token
        }
    }

    // Scenario 2: Guest with token
    if (guestToken) {
        // Validate token format (64 character hex string)
        if (!/^[a-f0-9]{64}$/i.test(guestToken)) {
            await auditRepo.logAccessDenied(dossierId, clientIp, userAgent, {
                reason: 'invalid_token_format',
            });

            return {
                status: 401,
                jsonBody: { success: false, error: 'Ongeldig token formaat' },
            };
        }

        const gastRepo = new DossierGastRepository();
        const gast = await gastRepo.findByToken(guestToken);

        if (gast) {
            // CRITICAL CHECK: Token dossier_id MUST match requested dossier_id
            if (gast.dossierId !== dossierId) {
                await auditRepo.logAccessDenied(dossierId, clientIp, userAgent, {
                    reason: 'guest_token_dossier_mismatch',
                    tokenDossierId: gast.dossierId,
                    requestedDossierId: dossierId,
                });

                return {
                    status: 403,
                    jsonBody: { success: false, error: 'Geen toegang tot dit dossier' },
                };
            }

            // Update last access
            await gastRepo.updateLastAccess(gast.id);

            // Parse permissions from rechten field
            const permissions = parseGuestPermissions(gast.rechten);

            return {
                type: 'guest',
                gastId: gast.id,
                gastEmail: gast.email,
                dossierId,
                permissions,
            };
        } else {
            // Token invalid or expired
            await auditRepo.logAccessDenied(dossierId, clientIp, userAgent, {
                reason: 'invalid_or_expired_guest_token',
            });

            return {
                status: 401,
                jsonBody: { success: false, error: 'Token ongeldig of verlopen' },
            };
        }
    }

    // No valid credentials provided
    await auditRepo.logAccessDenied(dossierId, clientIp, userAgent, {
        reason: 'no_valid_credentials',
    });

    return {
        status: 401,
        jsonBody: { success: false, error: 'Authenticatie vereist' },
    };
}

/**
 * Parse guest rechten string to permission array
 *
 * @param rechten - The rechten string ('upload', 'view', or 'upload_view')
 * @returns Array of permission strings
 */
function parseGuestPermissions(rechten: string): string[] {
    switch (rechten) {
        case 'upload_view':
            return ['upload', 'view', 'download'];
        case 'upload':
            return ['upload'];
        case 'view':
            return ['view', 'download'];
        default:
            return [];
    }
}

/**
 * Check if context has a specific permission
 *
 * @param context - The access context
 * @param permission - The permission to check
 * @returns True if context has the permission
 */
export function hasPermission(context: DossierAccessContext, permission: DossierPermission): boolean {
    return context.permissions.includes(permission);
}

/**
 * Require a specific permission, throwing an error if not present
 *
 * @param context - The access context
 * @param permission - The required permission
 * @throws Error if permission is missing
 */
export function requirePermission(context: DossierAccessContext, permission: DossierPermission): void {
    if (!hasPermission(context, permission)) {
        throw new Error(`Missing required permission: ${permission}`);
    }
}

/**
 * Check if the access context is an error response
 *
 * @param result - The result from verifyDossierAccess
 * @returns True if result is an HTTP error response
 */
export function isAccessDenied(
    result: DossierAccessContext | HttpResponseInit
): result is HttpResponseInit {
    return 'status' in result;
}

/**
 * Type guard to check if result is a valid access context
 *
 * @param result - The result from verifyDossierAccess
 * @returns True if result is a valid DossierAccessContext
 */
export function isAccessGranted(
    result: DossierAccessContext | HttpResponseInit
): result is DossierAccessContext {
    return !('status' in result);
}
