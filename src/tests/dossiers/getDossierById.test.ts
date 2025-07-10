import { HttpRequest, InvocationContext } from '@azure/functions';
import { getDossierById } from '../../functions/dossiers/getDossierById';
import { DossierDatabaseService } from '../../services/database-service';
import { Dossier } from '../../models/Dossier';

// Mock the database service
jest.mock('../../services/database-service');

describe('getDossierById', () => {
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

    it('should return dossier when user has access', async () => {
        // Arrange
        const mockDossier: Dossier = {
            id: 1,
            dossierNummer: 'DOS-2024-0001',
            gebruikerId: 123,
            status: 'nieuw',
            aangemaaktOp: '2024-01-01T00:00:00.000Z' as any,
            gewijzigdOp: '2024-01-01T00:00:00.000Z' as any
        };

        mockService.checkDossierAccess = jest.fn().mockResolvedValue(true);
        mockService.getCompleteDossierData = jest.fn().mockResolvedValue(mockDossier);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'GET',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: '1'
            }
        });

        // Act
        const response = await getDossierById(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 123);
        expect(mockService.getCompleteDossierData).toHaveBeenCalledWith(1);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(200);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(mockDossier);
    });

    it('should return 401 when x-user-id header is missing', async () => {
        // Arrange
        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'GET',
            headers: {},
            params: {
                dossierId: '1'
            }
        });

        // Act
        const response = await getDossierById(request, mockContext);

        // Assert
        expect(mockService.initialize).not.toHaveBeenCalled();
        expect(mockService.checkDossierAccess).not.toHaveBeenCalled();
        
        expect(response.status).toBe(401);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Unauthorized: Missing x-user-id header');
    });

    it('should return 404 when dossier does not exist', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(false);
        mockService.getCompleteDossierData = jest.fn().mockResolvedValue(null);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/999',
            method: 'GET',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: '999'
            }
        });

        // Act
        const response = await getDossierById(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(999, 123);
        expect(mockService.getCompleteDossierData).toHaveBeenCalledWith(999);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(404);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Dossier not found');
    });

    it('should return 403 when user has no access', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockResolvedValue(false);
        mockService.getCompleteDossierData = jest.fn().mockResolvedValue({ dossier_id: 1 });

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'GET',
            headers: {
                'x-user-id': '999'
            },
            params: {
                dossierId: '1'
            }
        });

        // Act
        const response = await getDossierById(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 999);
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
            method: 'GET',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: 'abc'
            }
        });

        // Act
        const response = await getDossierById(request, mockContext);

        // Assert
        expect(mockService.initialize).not.toHaveBeenCalled();
        
        expect(response.status).toBe(400);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toContain('Invalid parameters');
    });

    it('should handle database errors', async () => {
        // Arrange
        mockService.checkDossierAccess = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers/1',
            method: 'GET',
            headers: {
                'x-user-id': '123'
            },
            params: {
                dossierId: '1'
            }
        });

        // Act
        const response = await getDossierById(request, mockContext);

        // Assert
        expect(mockService.initialize).toHaveBeenCalled();
        expect(mockService.checkDossierAccess).toHaveBeenCalledWith(1, 123);
        expect(mockService.close).toHaveBeenCalled();
        
        expect(response.status).toBe(500);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Database error');
    });
});