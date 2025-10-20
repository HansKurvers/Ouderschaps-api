import { HttpRequest, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { getRollen, clearRollenCache } from '../../functions/lookups/getRollen';

jest.mock('../../services/database-service');

describe('getRollen', () => {
    let mockRequest: HttpRequest;
    let mockContext: InvocationContext;
    let mockDbService: jest.Mocked<DossierDatabaseService>;

    beforeEach(() => {
        // Clear cache before each test
        clearRollenCache();
        
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
        clearRollenCache();
    });

    it('should return roles successfully', async () => {
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

    it('should cache roles between calls within same module instance', async () => {
        const mockRollen = [
            { id: 1, naam: 'Moeder' },
            { id: 2, naam: 'Vader' },
        ];

        mockDbService.getRollen.mockResolvedValue(mockRollen);

        // First call should hit database
        const result1 = await getRollen(mockRequest, mockContext);
        expect(result1.status).toBe(200);
        
        // Second call should use cache since we're using the same module instance
        const result2 = await getRollen(mockRequest, mockContext);

        expect(result2.status).toBe(200);
        expect(JSON.parse(result2.body as string)).toEqual({
            success: true,
            data: mockRollen,
        });
        
        // Should only call database once due to caching
        expect(mockDbService.getRollen).toHaveBeenCalledTimes(1);
        // Initialize and close should only be called once (first call), not for cached response
        expect(mockDbService.initialize).toHaveBeenCalledTimes(1);
        expect(mockDbService.close).toHaveBeenCalledTimes(1);
        
        // Verify that the context.log was called to indicate cache hit
        expect(mockContext.log).toHaveBeenCalledWith('Returning cached roles data');
    });

    it('should handle database errors', async () => {
        mockDbService.getRollen.mockRejectedValue(new Error('Database error'));

        const result = await getRollen(mockRequest, mockContext);

        expect(result.status).toBe(500);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'Database error', // Updated to expect the actual error message
        });
        expect(mockDbService.close).toHaveBeenCalled();
    });
});