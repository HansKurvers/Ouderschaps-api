import {
    BlobServiceClient,
    ContainerClient,
    BlobSASPermissions,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;

/**
 * Blob Storage Service voor document opslag
 *
 * Elke dossier krijgt een eigen container voor volledige isolatie.
 * Container naam: dossier-{id met leading zeros}
 */
export const blobStorageService = {
    /**
     * Krijg of maak container voor een dossier
     * Container naam: dossier-{id met leading zeros}
     */
    async getOrCreateDossierContainer(dossierId: number): Promise<ContainerClient> {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerName = this.getContainerName(dossierId);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Maak container als deze niet bestaat
        await containerClient.createIfNotExists({
            access: undefined // Private, geen publieke toegang
        });

        return containerClient;
    },

    /**
     * Genereer container naam voor dossier
     */
    getContainerName(dossierId: number): string {
        return `dossier-${dossierId.toString().padStart(5, '0')}`;
    },

    /**
     * Genereer unieke bestandsnaam voor opslag
     */
    generateStorageFilename(originalFilename: string): string {
        const extension = originalFilename.split('.').pop()?.toLowerCase() || '';
        const uuid = uuidv4();
        return extension ? `${uuid}.${extension}` : uuid;
    },

    /**
     * Genereer blob path gebaseerd op categorie
     */
    generateBlobPath(categoryName: string, filename: string): string {
        const safeCategoryName = categoryName
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return `${safeCategoryName}/${filename}`;
    },

    /**
     * Genereer SAS URL voor uploaden (alleen schrijven, kort geldig)
     */
    async generateUploadSasUrl(
        dossierId: number,
        blobPath: string,
        contentType: string,
        expiresInMinutes: number = 15
    ): Promise<{ uploadUrl: string; expiresAt: Date }> {
        const containerClient = await this.getOrCreateDossierContainer(dossierId);
        const blobClient = containerClient.getBlockBlobClient(blobPath);

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

        const sasToken = generateBlobSASQueryParameters({
            containerName: this.getContainerName(dossierId),
            blobName: blobPath,
            permissions: BlobSASPermissions.parse('w'), // Alleen schrijven
            expiresOn: expiresAt,
            contentType: contentType,
        }, this.getSharedKeyCredential()).toString();

        return {
            uploadUrl: `${blobClient.url}?${sasToken}`,
            expiresAt
        };
    },

    /**
     * Genereer SAS URL voor downloaden (alleen lezen, kort geldig)
     */
    async generateDownloadSasUrl(
        dossierId: number,
        blobPath: string,
        expiresInMinutes: number = 60
    ): Promise<{ downloadUrl: string; expiresAt: Date }> {
        const containerClient = await this.getOrCreateDossierContainer(dossierId);
        const blobClient = containerClient.getBlockBlobClient(blobPath);

        // Controleer of blob bestaat
        const exists = await blobClient.exists();
        if (!exists) {
            throw new Error('Document niet gevonden');
        }

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

        const sasToken = generateBlobSASQueryParameters({
            containerName: this.getContainerName(dossierId),
            blobName: blobPath,
            permissions: BlobSASPermissions.parse('r'), // Alleen lezen
            expiresOn: expiresAt,
        }, this.getSharedKeyCredential()).toString();

        return {
            downloadUrl: `${blobClient.url}?${sasToken}`,
            expiresAt
        };
    },

    /**
     * Upload document direct naar blob storage
     */
    async uploadDocument(
        dossierId: number,
        categoryName: string,
        data: Buffer,
        originalFilename: string,
        mimeType: string
    ): Promise<{
        containerName: string;
        blobPath: string;
        storageFilename: string;
        size: number;
    }> {
        const containerClient = await this.getOrCreateDossierContainer(dossierId);
        const storageFilename = this.generateStorageFilename(originalFilename);
        const blobPath = this.generateBlobPath(categoryName, storageFilename);
        const blobClient = containerClient.getBlockBlobClient(blobPath);

        await blobClient.uploadData(data, {
            blobHTTPHeaders: {
                blobContentType: mimeType,
                blobContentDisposition: `attachment; filename="${encodeURIComponent(originalFilename)}"`,
            },
            metadata: {
                originalFilename: encodeURIComponent(originalFilename),
                uploadedAt: new Date().toISOString(),
            },
        });

        return {
            containerName: this.getContainerName(dossierId),
            blobPath,
            storageFilename,
            size: data.length,
        };
    },

    /**
     * Verwijder blob
     */
    async deleteBlob(dossierId: number, blobPath: string): Promise<void> {
        const containerClient = await this.getOrCreateDossierContainer(dossierId);
        const blobClient = containerClient.getBlockBlobClient(blobPath);
        await blobClient.deleteIfExists();
    },

    /**
     * Check of blob bestaat
     */
    async blobExists(dossierId: number, blobPath: string): Promise<boolean> {
        const containerClient = await this.getOrCreateDossierContainer(dossierId);
        const blobClient = containerClient.getBlockBlobClient(blobPath);
        return await blobClient.exists();
    },

    /**
     * Krijg blob properties
     */
    async getBlobProperties(dossierId: number, blobPath: string): Promise<{
        size: number;
        contentType: string;
        createdOn: Date;
    } | null> {
        const containerClient = await this.getOrCreateDossierContainer(dossierId);
        const blobClient = containerClient.getBlockBlobClient(blobPath);

        try {
            const properties = await blobClient.getProperties();
            return {
                size: properties.contentLength || 0,
                contentType: properties.contentType || 'application/octet-stream',
                createdOn: properties.createdOn || new Date(),
            };
        } catch (error: any) {
            if (error.statusCode === 404) {
                return null;
            }
            throw error;
        }
    },

    /**
     * Helper: krijg shared key credential
     */
    getSharedKeyCredential(): StorageSharedKeyCredential {
        // Extract account key from connection string
        const accountKey = connectionString?.match(/AccountKey=([^;]+)/)?.[1];
        if (!accountKey) throw new Error('Invalid storage connection string');
        return new StorageSharedKeyCredential(accountName, accountKey);
    }
};

// Export class-based version for backwards compatibility
export class BlobStorageService {
    getContainerName(dossierId: number): string {
        return blobStorageService.getContainerName(dossierId);
    }

    generateStorageFilename(originalFilename: string): string {
        return blobStorageService.generateStorageFilename(originalFilename);
    }

    generateBlobPath(categoryName: string, filename: string): string {
        return blobStorageService.generateBlobPath(categoryName, filename);
    }

    async generateUploadSasUrl(
        dossierId: number,
        blobPath: string,
        contentType: string,
        expiresInMinutes?: number
    ) {
        return blobStorageService.generateUploadSasUrl(dossierId, blobPath, contentType, expiresInMinutes);
    }

    async generateDownloadSasUrl(dossierId: number, blobPath: string, expiresInMinutes?: number) {
        return blobStorageService.generateDownloadSasUrl(dossierId, blobPath, expiresInMinutes);
    }

    async uploadDocument(
        dossierId: number,
        categoryName: string,
        data: Buffer,
        originalFilename: string,
        mimeType: string
    ) {
        return blobStorageService.uploadDocument(dossierId, categoryName, data, originalFilename, mimeType);
    }

    async getDownloadUrl(containerName: string, blobPath: string, expiresInMinutes?: number) {
        // Extract dossier ID from container name
        const match = containerName.match(/dossier-(\d+)/);
        const dossierId = match ? parseInt(match[1]) : 0;
        const result = await blobStorageService.generateDownloadSasUrl(dossierId, blobPath, expiresInMinutes);
        return result.downloadUrl;
    }

    async deleteDocument(containerName: string, blobPath: string) {
        const match = containerName.match(/dossier-(\d+)/);
        const dossierId = match ? parseInt(match[1]) : 0;
        return blobStorageService.deleteBlob(dossierId, blobPath);
    }

    async documentExists(containerName: string, blobPath: string) {
        const match = containerName.match(/dossier-(\d+)/);
        const dossierId = match ? parseInt(match[1]) : 0;
        return blobStorageService.blobExists(dossierId, blobPath);
    }
}
