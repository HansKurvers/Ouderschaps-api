import Joi from 'joi';

/**
 * Validator for document upload requests
 *
 * Note: File data validation (size, type) is done in the service layer
 * after the file is received, as Joi cannot validate binary data.
 */
export const uploadDocumentSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Dossier ID moet een nummer zijn',
            'number.positive': 'Dossier ID moet positief zijn',
            'any.required': 'Dossier ID is verplicht'
        }),

    categorieId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Categorie ID moet een nummer zijn',
            'number.positive': 'Categorie ID moet positief zijn',
            'any.required': 'Categorie ID is verplicht'
        }),

    bestandsnaam: Joi.string().max(255).required()
        .pattern(/^[^<>:"/\\|?*\x00-\x1f]+$/, 'valid filename')
        .messages({
            'string.base': 'Bestandsnaam moet een string zijn',
            'string.max': 'Bestandsnaam mag niet meer dan 255 tekens bevatten',
            'string.pattern.name': 'Bestandsnaam bevat ongeldige tekens',
            'any.required': 'Bestandsnaam is verplicht'
        }),
});

/**
 * Validator for guest invitation requests
 *
 * Business Rules:
 * - Email must be valid and unique per dossier
 * - Rechten must be one of: upload, view, upload_view
 * - Token expiry is optional (defaults to 30 days)
 */
export const createGuestInvitationSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Dossier ID moet een nummer zijn',
            'number.positive': 'Dossier ID moet positief zijn',
            'any.required': 'Dossier ID is verplicht'
        }),

    email: Joi.string().email().max(255).required()
        .messages({
            'string.base': 'Email moet een string zijn',
            'string.email': 'Voer een geldig emailadres in',
            'string.max': 'Email mag niet meer dan 255 tekens bevatten',
            'any.required': 'Email is verplicht'
        }),

    naam: Joi.string().max(255).optional()
        .messages({
            'string.base': 'Naam moet een string zijn',
            'string.max': 'Naam mag niet meer dan 255 tekens bevatten'
        }),

    rechten: Joi.string()
        .valid('upload', 'view', 'upload_view')
        .default('upload_view')
        .messages({
            'string.base': 'Rechten moet een string zijn',
            'any.only': 'Rechten moet zijn: upload, view, of upload_view'
        }),

    verlooptOpDagen: Joi.number().integer().min(1).max(365).optional()
        .messages({
            'number.base': 'Verloopdagen moet een nummer zijn',
            'number.min': 'Verloopdagen moet minimaal 1 zijn',
            'number.max': 'Verloopdagen mag maximaal 365 zijn'
        }),
});

/**
 * Validator for guest token in request headers or query params
 */
export const guestTokenSchema = Joi.object({
    token: Joi.string().hex().length(64).required()
        .messages({
            'string.base': 'Token moet een string zijn',
            'string.hex': 'Token moet een geldige hexadecimale string zijn',
            'string.length': 'Token moet 64 tekens lang zijn',
            'any.required': 'Token is verplicht'
        }),
});

/**
 * Validator for document ID in path parameters
 */
export const documentIdSchema = Joi.object({
    documentId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Document ID moet een nummer zijn',
            'number.positive': 'Document ID moet positief zijn',
            'any.required': 'Document ID is verplicht'
        }),
});

/**
 * Validator for guest ID in path parameters
 */
export const gastIdSchema = Joi.object({
    gastId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Gast ID moet een nummer zijn',
            'number.positive': 'Gast ID moet positief zijn',
            'any.required': 'Gast ID is verplicht'
        }),
});

/**
 * Validator for dossier ID in path parameters
 */
export const dossierIdSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Dossier ID moet een nummer zijn',
            'number.positive': 'Dossier ID moet positief zijn',
            'any.required': 'Dossier ID is verplicht'
        }),
});

/**
 * Validator for regenerating guest token
 */
export const regenerateTokenSchema = Joi.object({
    verlooptOpDagen: Joi.number().integer().min(1).max(365).optional()
        .messages({
            'number.base': 'Verloopdagen moet een nummer zijn',
            'number.min': 'Verloopdagen moet minimaal 1 zijn',
            'number.max': 'Verloopdagen mag maximaal 365 zijn'
        }),
});

// Helper functions

export function validateUploadDocument(data: any) {
    return uploadDocumentSchema.validate(data, { abortEarly: false });
}

export function validateCreateGuestInvitation(data: any) {
    return createGuestInvitationSchema.validate(data, { abortEarly: false });
}

export function validateGuestToken(data: any) {
    return guestTokenSchema.validate(data, { abortEarly: false });
}

export function validateDocumentId(data: any) {
    return documentIdSchema.validate(data, { abortEarly: false });
}

export function validateGastId(data: any) {
    return gastIdSchema.validate(data, { abortEarly: false });
}

export function validateDossierId(data: any) {
    return dossierIdSchema.validate(data, { abortEarly: false });
}

export function validateRegenerateToken(data: any) {
    return regenerateTokenSchema.validate(data, { abortEarly: false });
}

/**
 * Validates file extension against allowed extensions
 *
 * @param filename - Original filename
 * @param allowedExtensions - Comma-separated list of allowed extensions
 * @returns True if extension is allowed
 */
export function validateFileExtension(filename: string, allowedExtensions: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (!extension) return false;

    const allowed = allowedExtensions
        .toLowerCase()
        .split(',')
        .map(ext => ext.trim());

    return allowed.includes(extension);
}

/**
 * Validates file size against maximum allowed size
 *
 * @param sizeInBytes - File size in bytes
 * @param maxSizeMb - Maximum allowed size in MB
 * @returns True if size is within limit
 */
export function validateFileSize(sizeInBytes: number, maxSizeMb: number): boolean {
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    return sizeInBytes <= maxSizeBytes;
}

/**
 * Gets file extension from filename
 *
 * @param filename - Filename
 * @returns Extension without dot, lowercase
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length < 2) return '';
    return parts.pop()?.toLowerCase() || '';
}

/**
 * Validates MIME type matches expected type for extension
 *
 * @param mimeType - MIME type from file
 * @param extension - File extension
 * @returns True if MIME type is valid for extension
 */
export function validateMimeType(mimeType: string, extension: string): boolean {
    const mimeMap: Record<string, string[]> = {
        'pdf': ['application/pdf'],
        'jpg': ['image/jpeg'],
        'jpeg': ['image/jpeg'],
        'png': ['image/png'],
        'gif': ['image/gif'],
        'docx': [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        'doc': ['application/msword'],
        'xlsx': [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        'xls': ['application/vnd.ms-excel'],
    };

    const allowedMimes = mimeMap[extension.toLowerCase()];
    if (!allowedMimes) return true; // Unknown extension, allow

    return allowedMimes.includes(mimeType.toLowerCase());
}
