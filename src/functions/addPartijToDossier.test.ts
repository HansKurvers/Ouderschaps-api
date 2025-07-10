import { HttpRequest, InvocationContext } from '@azure/functions';
import { addPartijToDossier } from './addPartijToDossier';
import { DossierDatabaseService } from '../services/database-service';
import { getUserId } from '../utils/auth-helper';

jest.mock('../services/database-service');
jest.mock('../utils/auth-helper');

describe('addPartijToDossier', () => {
    let mockRequest: HttpRequest;
    let mockContext: InvocationContext;
    let mockDbService: jest.Mocked<DossierDatabaseService>;
    let mockGetUserId: jest.MockedFunction<typeof getUserId>;

    beforeEach(() => {
        mockRequest = {
            headers: new Map(),
            params: { dossierId: '1' },
            text: jest.fn(),
        } as unknown as HttpRequest;

        mockContext = {
            log: jest.fn(),
            error: jest.fn(),
        } as unknown as InvocationContext;

        mockDbService = {
            initialize: jest.fn(),
            close: jest.fn(),
            checkDossierAccess: jest.fn(),
            getPersoonById: jest.fn(),
            checkEmailUnique: jest.fn(),
            createOrUpdatePersoon: jest.fn(),
            checkPartijExists: jest.fn(),
            linkPersoonToDossierWithReturn: jest.fn(),
        } as unknown as jest.Mocked<DossierDatabaseService>;

        mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;

        (DossierDatabaseService as jest.Mock).mockImplementation(() => mockDbService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should add existing persoon to dossier successfully', async () => {
        const requestData = {
            persoonId: 1,
            rolId: 2,
        };

        const mockPersoon = {
            id: 1,
            achternaam: 'Doe',
            voornamen: 'John',
        };

        const mockResult = {
            id: 1,
            persoon: mockPersoon,
            rol: { id: 2, naam: 'Vader' },
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));
        mockDbService.checkDossierAccess.mockResolvedValue(true);
        mockDbService.getPersoonById.mockResolvedValue(mockPersoon);
        mockDbService.checkPartijExists.mockResolvedValue(false);
        mockDbService.linkPersoonToDossierWithReturn.mockResolvedValue(mockResult);

        const result = await addPartijToDossier(mockRequest, mockContext);

        expect(result.status).toBe(200);
        expect(JSON.parse(result.body as string)).toEqual({
            success: true,
            data: mockResult,
        });
        expect(mockDbService.checkDossierAccess).toHaveBeenCalledWith(1, 1);
        expect(mockDbService.getPersoonById).toHaveBeenCalledWith(1);
        expect(mockDbService.checkPartijExists).toHaveBeenCalledWith(1, 1, 2);
        expect(mockDbService.linkPersoonToDossierWithReturn).toHaveBeenCalledWith(1, 1, 2);
    });

    it('should create new persoon and add to dossier successfully', async () => {
        const requestData = {
            persoonData: {
                achternaam: 'Smith',
                voornamen: 'Jane',
                email: 'jane@example.com',
            },
            rolId: 1,
        };

        const mockNewPersoon = {
            id: 2,
            achternaam: 'Smith',
            voornamen: 'Jane',
            email: 'jane@example.com',
        };

        const mockResult = {
            id: 2,
            persoon: mockNewPersoon,
            rol: { id: 1, naam: 'Moeder' },
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));
        mockDbService.checkDossierAccess.mockResolvedValue(true);
        mockDbService.checkEmailUnique.mockResolvedValue(true);
        mockDbService.createOrUpdatePersoon.mockResolvedValue(mockNewPersoon);
        mockDbService.checkPartijExists.mockResolvedValue(false);
        mockDbService.linkPersoonToDossierWithReturn.mockResolvedValue(mockResult);

        const result = await addPartijToDossier(mockRequest, mockContext);

        expect(result.status).toBe(200);
        expect(JSON.parse(result.body as string)).toEqual({
            success: true,
            data: mockResult,
        });
        expect(mockDbService.checkEmailUnique).toHaveBeenCalledWith('jane@example.com');
        expect(mockDbService.createOrUpdatePersoon).toHaveBeenCalledWith(requestData.persoonData);
        expect(mockDbService.checkPartijExists).toHaveBeenCalledWith(1, 2, 1);
        expect(mockDbService.linkPersoonToDossierWithReturn).toHaveBeenCalledWith(1, 2, 1);
    });

    it('should return 403 when user lacks dossier access', async () => {
        const requestData = {
            persoonId: 1,
            rolId: 2,
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));
        mockDbService.checkDossierAccess.mockResolvedValue(false);

        const result = await addPartijToDossier(mockRequest, mockContext);

        expect(result.status).toBe(403);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'Access denied',
        });
    });

    it('should return 409 when partij already exists', async () => {
        const requestData = {
            persoonId: 1,
            rolId: 2,
        };

        const mockPersoon = {
            id: 1,
            achternaam: 'Doe',
            voornamen: 'John',
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));
        mockDbService.checkDossierAccess.mockResolvedValue(true);
        mockDbService.getPersoonById.mockResolvedValue(mockPersoon);
        mockDbService.checkPartijExists.mockResolvedValue(true);

        const result = await addPartijToDossier(mockRequest, mockContext);

        expect(result.status).toBe(409);
        expect(JSON.parse(result.body as string)).toEqual({
            success: false,
            error: 'This person already has this role in this dossier',
        });
    });

    it('should return 400 when validation fails', async () => {
        const requestData = {
            // Missing rolId
            persoonId: 1,
        };

        mockGetUserId.mockReturnValue(1);
        (mockRequest.text as jest.Mock).mockResolvedValue(JSON.stringify(requestData));

        const result = await addPartijToDossier(mockRequest, mockContext);

        expect(result.status).toBe(400);
        expect(JSON.parse(result.body as string).error).toContain('Validation failed');
    });
});