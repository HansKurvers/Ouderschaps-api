import { HttpRequest, InvocationContext } from '@azure/functions';
import { updateDossier } from '../../functions/dossiers/updateDossier';
import { DossierDatabaseService } from '../../services/database-service';
import { Dossier } from '../../models/Dossier';
import * as authHelper from '../../utils/auth-helper';

// Mock the database service and auth helper
jest.mock('../../services/database-service');
jest.mock('../../utils/auth-helper');

describe('updateDossier', () => {
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

    it('should update dossier status when user has access', async () => {
        // Arrange
        const updatedDossier: Dossier = {
            id: 1,
            dossierNummer: 'DOS-2024-0001',
            gebruikerId: 123,
            status: false,
            aangemaaktOp: '2024-01-01T00:00:00.000Z' as any,
            gewijzigdOp: '2024-01-02T00:00:00.000Z' as any
        };

        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);
        mockService.updateDossierStatus = jest.fn().mockResolvedValue(updatedDossier);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'PUT',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {
                dossierId: '1'
            },
            body: {
                string: JSON.stringify({ status: false })
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 123);
        expect(mockService.updateDossierStatus).toHaveBeenCalledWith(1, false);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(updatedDossier);
    });

    it('should return 401 when authentication fails', async () => {
        // Arrange
        (authHelper.requireAuthentication as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'PUT',
            headers: {},
            params: {
                dossierId: '1'
            },
            body: {
                string: JSON.stringify({ status: false })
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

        // Assert
        expect(response.status).toBe(401);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(mockService.checkDossierAccess).not.toHaveBeenCalled();
    });

    it('should return 400 when dossierId is invalid', async () => {
        // Arrange
        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/invalid',
            method: 'PUT',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {
                dossierId: 'invalid'
            },
            body: {
                string: JSON.stringify({ status: false })
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

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
            method: 'PUT',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {
                dossierId: '1'
            },
            body: {
                string: JSON.stringify({ status: false })
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 999);
        expect(mockService.updateDossierStatus).not.toHaveBeenCalled();
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(403);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Access denied');
    });

    it('should handle empty body and return current dossier', async () => {
        // Arrange
        const currentDossier: Dossier = {
            id: 1,
            dossierNummer: 'DOS-2024-0001',
            gebruikerId: 123,
            status: true,
            aangemaaktOp: '2024-01-01T00:00:00.000Z' as any,
            gewijzigdOp: '2024-01-01T00:00:00.000Z' as any
        };

        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);
        mockService.getDossierById = jest.fn().mockResolvedValue(currentDossier);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'PUT',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {
                dossierId: '1'
            },
            body: {
                string: ''
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 123);
        expect(mockService.getDossierById).toHaveBeenCalledWith(1);
        expect(mockService.updateDossierStatus).not.toHaveBeenCalled();
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(currentDossier);
    });

    it('should return 400 when body has invalid status', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'PUT',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {
                dossierId: '1'
            },
            body: {
                string: JSON.stringify({ status: 'invalid' })
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

        // Assert
        expect(response.status).toBe(400);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toContain('Invalid body');
    });

    it('should handle database errors', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);
        mockService.updateDossierStatus = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'PUT',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {
                dossierId: '1'
            },
            body: {
                string: JSON.stringify({ status: false })
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 123);
        expect(mockService.updateDossierStatus).toHaveBeenCalledWith(1, false);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(500);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Database error');
        expect(mockContext.error).toHaveBeenCalled();
    });
});