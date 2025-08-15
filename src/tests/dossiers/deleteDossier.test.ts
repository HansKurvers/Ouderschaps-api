import { HttpRequest, InvocationContext } from '@azure/functions';
import { deleteDossier } from '../../functions/dossiers/deleteDossier';
import { DossierDatabaseService } from '../../services/database-service';
import * as authHelper from '../../utils/auth-helper';

// Mock the database service and auth helper
jest.mock('../../services/database-service');
jest.mock('../../utils/auth-helper');

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

        // Mock requireAuthentication to return a user ID
        (authHelper.requireAuthentication as jest.Mock).mockResolvedValue(123);
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
                'authorization': 'Bearer fake-token'
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
        expect(body.data.message).toBe('Dossier deleted successfully');
    });

    it('should return 401 when authentication fails', async () => {
        // Arrange
        (authHelper.requireAuthentication as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

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
        expect(response.status).toBe(401);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(mockService.deleteDossier).not.toHaveBeenCalled();
    });

    it('should return 400 when dossierId is invalid', async () => {
        // Arrange
        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/invalid',
            method: 'DELETE',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {
                dossierId: 'invalid'
            }
        });

        // Act
        const response = await deleteDossier(request, mockContext);

        // Assert
        expect(response.status).toBe(400);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toContain('Invalid parameters');
    });

    it('should return 403 when user has no access', async () => {
        // Arrange
        (authHelper.requireAuthentication as jest.Mock).mockResolvedValue(999);
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(false);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'DELETE',
            headers: {
                'authorization': 'Bearer fake-token'
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

    it('should handle database errors', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);
        mockService.deleteDossier = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'DELETE',
            headers: {
                'authorization': 'Bearer fake-token'
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
        expect(mockContext.error).toHaveBeenCalled();
    });
});
