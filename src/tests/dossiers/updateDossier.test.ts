import { HttpRequest, InvocationContext } from '@azure/functions';
import { updateDossier } from '../../functions/dossiers/updateDossier';
import { DossierDatabaseService } from '../../services/database-service';
import { Dossier } from '../../models/Dossier';

// Mock the database service
jest.mock('../../services/database-service');

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
                'x-user-id': '123'
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

    it('should return 401 when x-user-id header is missing', async () => {
        // Arrange
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
            method: 'PUT',
            headers: {
                'x-user-id': '999'
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
        expect(body.error).toBe('Forbidden: You do not have access to this resource');
    });

    it('should handle empty body and return current dossier', async () => {
        // Arrange
        const currentDossier = {
            id: 1,
            dossierNummer: 'DOS-2024-0001',
            gebruikerId: 123,
            status: false,
            aangemaaktOp: '2024-01-01T00:00:00.000Z' as any,
            gewijzigdOp: '2024-01-01T00:00:00.000Z' as any
        };
        
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);
        mockService.getDossierById = jest.fn().mockResolvedValue(currentDossier);
        
        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'PUT',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: '1'
            },
            body: {
                string: JSON.stringify({})
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 123);
        expect(mockService.getDossierById).toHaveBeenCalledWith(1);
        expect(mockService.updateDossierStatus).not.toHaveBeenCalled();
        
        expect(response.status).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(currentDossier);
    });

    it('should return 400 when dossierId is invalid', async () => {
        // Arrange
        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/abc',
            method: 'PUT',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: 'abc'
            },
            body: {
                string: JSON.stringify({ status: false })
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

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
        mockService.updateDossierStatus = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'PUT',
            headers: {
                'x-user-id': '123'
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
    });

    it('should validate status values', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'PUT',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: '1'
            },
            body: {
                string: JSON.stringify({ status: 123 }) // Invalid status type
            }
        });

        // Act
        const response = await updateDossier(request, mockContext);

        // Assert
        expect(mockService.initialize).not.toHaveBeenCalled();
        
        expect(response.status).toBe(400);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toContain('Invalid body');
    });
});