import { HttpRequest, InvocationContext } from '@azure/functions';
import { createDossier } from '../../functions/dossiers/createDossier';
import { DossierDatabaseService } from '../../services/database-service';
import { Dossier } from '../../models/Dossier';
import * as authHelper from '../../utils/auth-helper';

// Mock the database service and auth helper
jest.mock('../../services/database-service');
jest.mock('../../utils/auth-helper');

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

        // Mock requireAuthentication to return a user ID
        (authHelper.requireAuthentication as jest.Mock).mockResolvedValue(123);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new dossier when authenticated', async () => {
        // Arrange
        const newDossier: Dossier = {
            id: 1,
            dossierNummer: 'DOS-2024-0001',
            gebruikerId: 123,
            status: false,
            aangemaaktOp: '2024-01-01T00:00:00.000Z' as any,
            gewijzigdOp: '2024-01-01T00:00:00.000Z' as any
        };

        mockService.createDossier = jest.fn().mockResolvedValue(newDossier);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {}
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
        expect(body.data).toEqual(newDossier);
    });

    it('should return 401 when authentication fails', async () => {
        // Arrange
        (authHelper.requireAuthentication as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {},
            params: {}
        });

        // Act
        const response = await createDossier(request, mockContext);

        // Assert
        expect(response.status).toBe(401);
        const body = JSON.parse(response.body as string);
        expect(body.success).toBe(false);
        expect(mockService.createDossier).not.toHaveBeenCalled();
    });

    it('should work in development mode with SKIP_AUTH', async () => {
        // Arrange
        process.env.SKIP_AUTH = 'true';
        process.env.DEV_USER_ID = '1';
        
        (authHelper.requireAuthentication as jest.Mock).mockResolvedValue(1);
        
        const newDossier: Dossier = {
            id: 2,
            dossierNummer: 'DOS-2024-0002',
            gebruikerId: 1,
            status: false,
            aangemaaktOp: '2024-01-01T00:00:00.000Z' as any,
            gewijzigdOp: '2024-01-01T00:00:00.000Z' as any
        };

        mockService.createDossier = jest.fn().mockResolvedValue(newDossier);

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {},
            params: {}
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
        expect(body.data).toEqual(newDossier);

        // Cleanup
        delete process.env.SKIP_AUTH;
        delete process.env.DEV_USER_ID;
    });

    it('should handle database errors', async () => {
        // Arrange
        mockService.createDossier = jest.fn().mockRejectedValue(new Error('Database error'));

        const request = new HttpRequest({
            url: 'http://localhost/api/dossiers',
            method: 'POST',
            headers: {
                'authorization': 'Bearer fake-token'
            },
            params: {}
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
        expect(mockContext.error).toHaveBeenCalled();
    });
});
