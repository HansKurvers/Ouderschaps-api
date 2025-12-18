import { BaseRepository } from './base/BaseRepository';
import { DocumentCategorie } from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

/**
 * Repository for DocumentCategorie entity operations
 *
 * Responsibilities:
 * - Document category CRUD operations (mostly read-only, categories are seeded)
 * - Filtering by active status
 * - Validation of file extensions and sizes
 *
 * @example
 * ```typescript
 * const repo = new DocumentCategorieRepository();
 * const categories = await repo.findAllActive();
 * const category = await repo.findById(1);
 * const isValid = await repo.validateExtension(1, 'pdf');
 * ```
 */
export class DocumentCategorieRepository extends BaseRepository {
    /**
     * Finds all active document categories
     *
     * @returns Array of active categories ordered by volgorde
     */
    async findAllActive(): Promise<DocumentCategorie[]> {
        const query = `
            SELECT
                id,
                naam,
                beschrijving,
                icoon,
                toegestane_extensies,
                max_bestandsgrootte_mb,
                volgorde,
                actief,
                aangemaakt_op
            FROM dbo.document_categorieen
            WHERE actief = 1
            ORDER BY volgorde ASC
        `;

        const records = await this.queryMany(query);
        return records.map(DbMappers.toDocumentCategorie);
    }

    /**
     * Finds all document categories (including inactive)
     *
     * @returns Array of all categories ordered by volgorde
     */
    async findAll(): Promise<DocumentCategorie[]> {
        const query = `
            SELECT
                id,
                naam,
                beschrijving,
                icoon,
                toegestane_extensies,
                max_bestandsgrootte_mb,
                volgorde,
                actief,
                aangemaakt_op
            FROM dbo.document_categorieen
            ORDER BY volgorde ASC
        `;

        const records = await this.queryMany(query);
        return records.map(DbMappers.toDocumentCategorie);
    }

    /**
     * Finds a category by ID
     *
     * @param categorieId - The category ID
     * @returns Category or null if not found
     */
    async findById(categorieId: number): Promise<DocumentCategorie | null> {
        const query = `
            SELECT
                id,
                naam,
                beschrijving,
                icoon,
                toegestane_extensies,
                max_bestandsgrootte_mb,
                volgorde,
                actief,
                aangemaakt_op
            FROM dbo.document_categorieen
            WHERE id = @categorieId
        `;

        const record = await this.querySingle(query, { categorieId });
        return record ? DbMappers.toDocumentCategorie(record) : null;
    }

    /**
     * Validates if a file extension is allowed for a category
     *
     * @param categorieId - The category ID
     * @param extension - The file extension (without dot)
     * @returns True if extension is allowed
     */
    async validateExtension(categorieId: number, extension: string): Promise<boolean> {
        const category = await this.findById(categorieId);
        if (!category || !category.toegestaneExtensies) {
            return false;
        }

        const allowedExtensions = category.toegestaneExtensies
            .toLowerCase()
            .split(',')
            .map(ext => ext.trim());

        return allowedExtensions.includes(extension.toLowerCase());
    }

    /**
     * Validates if a file size is within the allowed limit for a category
     *
     * @param categorieId - The category ID
     * @param sizeInBytes - The file size in bytes
     * @returns True if size is within limit
     */
    async validateFileSize(categorieId: number, sizeInBytes: number): Promise<boolean> {
        const category = await this.findById(categorieId);
        if (!category) {
            return false;
        }

        const maxSizeInBytes = category.maxBestandsgrootteMb * 1024 * 1024;
        return sizeInBytes <= maxSizeInBytes;
    }

    /**
     * Gets the allowed extensions for a category as an array
     *
     * @param categorieId - The category ID
     * @returns Array of allowed extensions (lowercase, without dots)
     */
    async getAllowedExtensions(categorieId: number): Promise<string[]> {
        const category = await this.findById(categorieId);
        if (!category || !category.toegestaneExtensies) {
            return [];
        }

        return category.toegestaneExtensies
            .toLowerCase()
            .split(',')
            .map(ext => ext.trim());
    }
}
