import { HttpRequest, InvocationContext } from '@azure/functions';
import { deleteDossier } from './deleteDossier';
import { DossierDatabaseService } from '../services/database-service';

// Mock the database service
jest.mock('../services/database-service');

describe('deleteDossier', () => {
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

    it('should delete dossier when user has access', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);
        mockService.deleteDossier = jest.fn().mockResolvedValue(true);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'DELETE',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: '1'
            }
        });

        // Act
        const response = await deleteDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 123);
        expect(mockService.deleteDossier).toHaveBeenCalledWith(1);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(true);
        expect(body.data).toEqual({ message: 'Dossier deleted successfully' });
    });

    it('should return 401 when x-user-id header is missing', async () => {
        // Arrange
        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'DELETE',
            headers: {},
            params: {
                dossierId: '1'
            }
        });

        // Act
        const response = await deleteDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).not.toHaveBeenCalled();
        expect(mockService.checkDossierAccess).not.toHaveBeenCalled();
        
        expect(response.status).toBe(401);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Unauthorized: Missing x-user-id header');
    });

    it('should return 403 when user has no access', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(false);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'DELETE',
            headers: {
                'x-user-id': '999'
            },
            params: {
                dossierId: '1'
            }
        });

        // Act
        const response = await deleteDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 999);
        expect(mockService.deleteDossier).not.toHaveBeenCalled();
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(403);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Forbidden: You do not have access to this resource');
    });

    it('should return 400 when dossierId is invalid', async () => {
        // Arrange
        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/abc',
            method: 'DELETE',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: 'abc'
            }
        });

        // Act
        const response = await deleteDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).not.toHaveBeenCalled();
        
        expect(response.status).toBe(400);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toContain('Invalid parameters');
    });

    it('should handle database errors', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);
        mockService.deleteDossier = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'DELETE',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: '1'
            }
        });

        // Act
        const response = await deleteDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 123);
        expect(mockService.deleteDossier).toHaveBeenCalledWith(1);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(500);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Database error');
    });

    it('should ensure database service is closed even when error occurs', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'DELETE',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: '1'
            }
        });

        // Act
        await deleteDossier(request, mockContext);

        // Assert
        expect(mockService.close).toHaveBeenCalled();
    });
});