import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDocumentRepository } from '../../repositories/DossierDocumentRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { DocumentCategorieRepository } from '../../repositories/DocumentCategorieRepository';
import { DocumentAuditLogRepository } from '../../repositories/DocumentAuditLogRepository';
import { BlobStorageService } from '../../services/blob-storage.service';
import {
    authenticateUserOrGuest,
    requireGuestDossierAccess,
    guestHasPermission,
    extractClientIp,
    extractUserAgent,
} from '../../utils/guest-auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from '../../utils/response-helper';
import {
    validateFileExtension,
    validateFileSize,
    validateMimeType,
    getFileExtension,
} from '../../validators/document-portal-validator';

/**
 * POST /api/dossiers/{dossierId}/documenten
 *
 * Uploads a document to a dossier.
 * Request must be multipart/form-data with:
 * - file: The file to upload
 * - categorieId: Document category ID
 *
 * Accessible by:
 * - Dossier owner
 * - Shared users
 * - Guests with upload permission
 */
export async function uploadDocument(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Upload Document endpoint called');

    try {
        // Parse dossier ID from route
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Authenticate user or guest
        const authResult = await authenticateUserOrGuest(request);

        if (!authResult.authenticated) {
            return createUnauthorizedResponse();
        }

        // Authorization check
        if (authResult.type === 'user') {
            // User: check dossier access
            const dossierRepo = new DossierRepository();
            const hasAccess = await dossierRepo.checkAccess(dossierId, authResult.userId!);
            if (!hasAccess) {
                return createForbiddenResponse();
            }
        } else if (authResult.type === 'guest') {
            // Guest: check dossier matches and has upload permission
            requireGuestDossierAccess(authResult.gast!, dossierId);
            if (!guestHasPermission(authResult.gast!, 'upload')) {
                return createErrorResponse('Guest lacks upload permission', 403);
            }
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const categorieIdStr = formData.get('categorieId') as string | null;

        if (!file) {
            return createErrorResponse('No file provided', 400);
        }

        if (!categorieIdStr) {
            return createErrorResponse('Category ID is required', 400);
        }

        const categorieId = parseInt(categorieIdStr);
        if (isNaN(categorieId)) {
            return createErrorResponse('Invalid category ID', 400);
        }

        // Validate category exists
        const categorieRepo = new DocumentCategorieRepository();
        const categorie = await categorieRepo.findById(categorieId);
        if (!categorie || !categorie.actief) {
            return createErrorResponse('Category not found or inactive', 404);
        }

        // Validate file extension
        const extension = getFileExtension(file.name);
        if (!extension) {
            return createErrorResponse('File must have an extension', 400);
        }

        if (!validateFileExtension(file.name, categorie.toegestaneExtensies || '')) {
            return createErrorResponse(
                `File type not allowed for this category. Allowed: ${categorie.toegestaneExtensies}`,
                400
            );
        }

        // Validate file size
        if (!validateFileSize(file.size, categorie.maxBestandsgrootteMb)) {
            return createErrorResponse(
                `File too large. Maximum size: ${categorie.maxBestandsgrootteMb} MB`,
                400
            );
        }

        // Validate MIME type matches extension
        if (!validateMimeType(file.type, extension)) {
            return createErrorResponse('File MIME type does not match extension', 400);
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to blob storage
        const blobService = new BlobStorageService();
        const uploadResult = await blobService.uploadDocument(
            dossierId,
            categorie.naam,
            buffer,
            file.name,
            file.type
        );

        // Create document record in database
        const documentRepo = new DossierDocumentRepository();
        const document = await documentRepo.create(
            {
                dossierId,
                categorieId,
                origineleBestandsnaam: file.name,
                opgeslagenBestandsnaam: uploadResult.storageFilename,
                bestandsgrootte: uploadResult.size,
                mimeType: file.type,
                blobContainer: uploadResult.containerName,
                blobPath: uploadResult.blobPath,
                uploadIp: extractClientIp(request),
            },
            authResult.type === 'user' ? authResult.userId : undefined,
            authResult.type === 'guest' ? authResult.gast!.id : undefined
        );

        // Log upload action
        const auditRepo = new DocumentAuditLogRepository();
        await auditRepo.logUpload(
            dossierId,
            document.id,
            {
                gebruikerId: authResult.type === 'user' ? authResult.userId : undefined,
                gastId: authResult.type === 'guest' ? authResult.gast!.id : undefined,
            },
            extractClientIp(request),
            extractUserAgent(request),
            {
                filename: file.name,
                size: file.size,
                mimeType: file.type,
                categorieId,
            }
        );

        return createSuccessResponse(
            {
                id: document.id,
                origineleBestandsnaam: document.origineleBestandsnaam,
                bestandsgrootte: document.bestandsgrootte,
                mimeType: document.mimeType,
                categorieId: document.categorieId,
                aangemaaktOp: document.aangemaaktOp,
            },
            201
        );
    } catch (error) {
        context.error('Error uploading document:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to upload document',
            500
        );
    }
}

app.http('uploadDocument', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/documenten',
    handler: uploadDocument,
});
