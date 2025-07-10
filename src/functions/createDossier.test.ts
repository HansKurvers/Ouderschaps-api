import { HttpRequest, InvocationContext } from '@azure/functions';
import { createDossier } from './createDossier';
import { DossierDatabaseService } from '../services/database-service';
import { Dossier } from '../models/Dossier';

// Mock the database service
jest.mock('../services/database-service');

describe('createDossier', () => {
    let mockContext: InvocationContext;
    let mockService: jest.Mocked<DossierDatabaseService>;

    beforeEach(() => {
        mockContext = {
            log: jest.fn(),
            error: jest.fn(),
        } as any;

        mockService = new DossierDatabaseService() as jest.Mocked<DossierDatabaseService>;
        (DossierDatabaseService as any).mockImplementation(() => mockService);
        
        mockService.initialize = jest.fn().mockResolvedValue(undefined);
        mockService.close = jest.fn().mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new dossier when valid x-user-id header is provided', async () => {
        // Arrange
        const mockDossier: Dossier = {
            id: 1,
            dossierNummer: 'DOS-2024-0001',
            gebruikerId: 123,
            status: 'nieuw',
            aangemaaktOp: '2024-01-01T00:00:00.000Z' as any,
            gewijzigdOp: '2024-01-01T00:00:00.000Z' as any
        };

        mockService.createDossier = jest.fn().mockResolvedValue(mockDossier);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {
                'x-user-id': '123'
            },
            body: {}
        });

        // Act
        const response = await createDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.createDossier).toHaveBeenCalledWith(123);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(201);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(mockDossier);
    });

    it('should return 401 when x-user-id header is missing in production mode', async () => {
        // Arrange
        const originalEnv = process.env.SKIP_AUTH;
        process.env.SKIP_AUTH = 'false';
        
        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {},
            body: {}
        });

        // Act
        const response = await createDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).not.toHaveBeenCalled();
        expect(mockService.createDossier).not.toHaveBeenCalled();
        
        expect(response.status).toBe(401);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Unauthorized: Missing x-user-id header');
        
        // Cleanup
        process.env.SKIP_AUTH = originalEnv;
    });

    it('should work without x-user-id header in development mode', async () => {
        // Arrange
        const originalEnv = process.env.SKIP_AUTH;
        process.env.SKIP_AUTH = 'true';
        
        const mockDossier: Dossier = {
            id: 1,
            dossierNummer: 'DOS-2024-0001',
            gebruikerId: 1,
            status: 'nieuw',
            aangemaaktOp: '2024-01-01T00:00:00.000Z' as any,
            gewijzigdOp: '2024-01-01T00:00:00.000Z' as any
        };

        mockService.createDossier = jest.fn().mockResolvedValue(mockDossier);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {},
            body: {}
        });

        // Act
        const response = await createDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.createDossier).toHaveBeenCalledWith(1);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(201);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(mockDossier);
        
        // Cleanup
        process.env.SKIP_AUTH = originalEnv;
    });

    it('should handle database errors', async () => {
        // Arrange
        mockService.createDossier = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {
                'x-user-id': '123'
            },
            body: {}
        });

        // Act
        const response = await createDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.createDossier).toHaveBeenCalledWith(123);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(500);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Database error');
    });

    it('should ensure database service is closed even when error occurs', async () => {
        // Arrange
        mockService.createDossier = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {
                'x-user-id': '123'
            },
            body: {}
        });

        // Act
        await createDossier(request, mockContext);

        // Assert
        expect(mockService.close).toHaveBeenCalled();
    });
});