import { HttpRequest, InvocationContext } from '@azure/functions';
import { createPersoon } from './createPersoon';
import { DossierDatabaseService } from '../services/database-service';
import { getUserId } from '../utils/auth-helper';

jest.mock('../services/database-service');
jest.mock('../utils/auth-helper');

describe('createPersoon', () => {
    let mockRequest: HttpRequest;
    let mockContext: InvocationContext;
    let mockDbService: jest.Mocked<DossierDatabaseService>;
    let mockGetUserId: jest.MockedFunction<typeof getUserId>;

    beforeEach(() => {
        mockRequest = {
            headers: new Map(),
            params: {},
            text: jest.fn(),
        } as unknown as HttpRequest;

        mockContext = {
            log: jest.fn(),
            error: jest.fn(),
        } as unknown as InvocationContext;

        mockDbService = {
            initialize: jest.fn(),
            close: jest.fn(),
            checkEmailUnique: jest.fn(),
            createOrUpdatePersoon: jest.fn(),
        } as unknown as jest.Mocked<DossierDatabaseService>;

        mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;

        (DossierDatabaseService as jest.Mock).mockImplementation(() => mockDbService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new persoon successfully', async () => {
        const requestData = {
            achternaam: 'Doe',
            voornamen: 'John',
            email: 'john@example.com',
        };

        const mockPersoon = {
            id: 1,
            achternaam: 'Doe',
            voornamen: 'John',
            email: 'john@example.com',
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));
        mockDbService.checkEmailUnique.mockResolvedValue(true);
        mockDbService.createOrUpdatePersoon.mockResolvedValue(mockPersoon);

        const result = await createPersoon(mockRequest, mockContext);

        expect(result.status).toBe(200);
        expect(JSON.parse(result.body as string)).toEqual({
            success: true,
            data: mockPersoon,
        });
        expect(mockDbService.initialize).toHaveBeenCalled();
        expect(mockDbService.checkEmailUnique).toHaveBeenCalledWith('john@example.com');
        expect(mockDbService.createOrUpdatePersoon).toHaveBeenCalledWith(requestData);
    });

    it('should return 401 when user is not authenticated', async () => {
        mockGetUserId.mockReturnValue(null);

        const result = await createPersoon(mockRequest, mockContext);

        expect(result.status).toBe(401);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'Unauthorized',
        });
    });

    it('should return 400 when request body is missing', async () => {
        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue('');

        const result = await createPersoon(mockRequest, mockContext);

        expect(result.status).toBe(400);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'Request body is required',
        });
    });

    it('should return 400 when validation fails', async () => {
        const requestData = {
            // Missing required achternaam
            voornamen: 'John',
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));

        const result = await createPersoon(mockRequest, mockContext);

        expect(result.status).toBe(400);
        expect(JSON.parse(result.body as string).error).toContain('Validation failed');
    });

    it('should return 409 when email already exists', async () => {
        const requestData = {
            achternaam: 'Doe',
            email: 'existing@example.com',
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));
        mockDbService.checkEmailUnique.mockResolvedValue(false);

        const result = await createPersoon(mockRequest, mockContext);

        expect(result.status).toBe(409);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'Email address already exists',
        });
    });

    it('should handle database errors', async () => {
        const requestData = {
            achternaam: 'Doe',
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));
        mockDbService.createOrUpdatePersoon.mockRejectedValue(new Error('Database error'));

        const result = await createPersoon(mockRequest, mockContext);

        expect(result.status).toBe(500);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'Internal server error',
        });
        expect(mockDbService.close).toHaveBeenCalled();
    });
});