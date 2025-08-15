import { HttpRequest, InvocationContext } from '@azure/functions';
import { createPersoon } from '../../functions/personen/createPersoon';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';

jest.mock('../../services/database-service');
jest.mock('../../utils/auth-helper');

describe('createPersoon', () => {
    let mockRequest: HttpRequest;
    let mockContext: InvocationContext;
    let mockDbService: jest.Mocked<DossierDatabaseService>;
    let mockRequireAuthentication: jest.MockedFunction<typeof requireAuthentication>;

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

        mockRequireAuthentication = requireAuthentication as jest.MockedFunction<typeof requireAuthentication>;

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

        mockRequireAuthentication.mockResolvedValue(1);
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
        mockRequireAuthentication.mockRejectedValue(new Error('Unauthorized'));

        const result = await createPersoon(mockRequest, mockContext);

        expect(result.status).toBe(401);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'Authentication required',
        });
    });

    it('should return 400 when request body is missing', async () => {
        mockRequireAuthentication.mockResolvedValue(1);
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

        mockRequireAuthentication.mockResolvedValue(1);
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

        mockRequireAuthentication.mockResolvedValue(1);
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

        mockRequireAuthentication.mockResolvedValue(1);
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