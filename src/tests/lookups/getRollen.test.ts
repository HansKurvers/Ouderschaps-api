import { HttpRequest, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';

jest.mock('../../services/database-service');

describe('getRollen', () => {
    let mockRequest: HttpRequest;
    let mockContext: InvocationContext;
    let mockDbService: jest.Mocked<DossierDatabaseService>;

    beforeEach(() => {
        mockRequest = {
            headers: new Map(),
            params: {},
        } as unknown as HttpRequest;

        mockContext = {
            log: jest.fn(),
            error: jest.fn(),
        } as unknown as InvocationContext;

        mockDbService = {
            initialize: jest.fn(),
            close: jest.fn(),
            getRollen: jest.fn(),
        } as unknown as jest.Mocked<DossierDatabaseService>;

        (DossierDatabaseService as jest.Mock).mockImplementation(() => mockDbService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Clear cache by importing and resetting the module
        jest.resetModules();
    });

    it('should return roles successfully', async () => {
        const { getRollen } = require('../../functions/lookups/getRollen');
        const mockRollen = [
            { id: 1, naam: 'Moeder' },
            { id: 2, naam: 'Vader' },
        ];

        mockDbService.getRollen.mockResolvedValue(mockRollen);

        const result = await getRollen(mockRequest, mockContext);

        expect(result.status).toBe(200);
        expect(JSON.parse(result.body as string)).toEqual({
            success: true,
            data: mockRollen,
        });
        expect(mockDbService.initialize).toHaveBeenCalled();
        expect(mockDbService.close).toHaveBeenCalled();
    });

    it('should cache roles between calls', async () => {
        const { getRollen } = require('../../functions/lookups/getRollen');
        const mockRollen = [
            { id: 1, naam: 'Moeder' },
            { id: 2, naam: 'Vader' },
        ];

        mockDbService.getRollen.mockResolvedValue(mockRollen);

        // First call should hit database
        const result1 = await getRollen(mockRequest, mockContext);
        expect(result1.status).toBe(200);
        
        // Reset mocks to test cache
        jest.clearAllMocks();
        (DossierDatabaseService as jest.Mock).mockImplementation(() => mockDbService);
        
        // Second call should use cache (no database call)
        const result2 = await getRollen(mockRequest, mockContext);

        expect(result2.status).toBe(200);
        expect(JSON.parse(result2.body as string)).toEqual({
            success: true,
            data: mockRollen,
        });
        
        // Should NOT call database for cached result
        expect(mockDbService.getRollen).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
        const { getRollen } = require('../../functions/lookups/getRollen');
        mockDbService.getRollen.mockRejectedValue(new Error('Database error'));

        const result = await getRollen(mockRequest, mockContext);

        expect(result.status).toBe(500);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'Internal server error',
        });
        expect(mockDbService.close).toHaveBeenCalled();
    });
});