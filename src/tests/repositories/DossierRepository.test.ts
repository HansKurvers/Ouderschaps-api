import { DossierRepository } from '../../repositories/DossierRepository';
import * as database from '../../config/database';

// Mock the database module
jest.mock('../../config/database');

describe('DossierRepository', () => {
    let repository: DossierRepository;
    let mockPool: any;
    let mockRequest: any;

    beforeEach(() => {
        repository = new DossierRepository();

        // Setup mock request
        mockRequest = {
            input: jest.fn().mockReturnThis(),
            query: jest.fn(),
        };

        // Setup mock pool
        mockPool = {
            request: jest.fn().mockReturnValue(mockRequest),
        };

        // Mock getPool to return our mock pool
        (database.getPool as jest.Mock).mockResolvedValue(mockPool);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findByUserId', () => {
        it('should return dossiers for a specific user', async () => {
            // Arrange
            const userId = 123;
            const mockRecords = [
                {
                    id: 1,
                    dossier_nummer: '1000',
                    gebruiker_id: userId,
                    status: false,
                    is_anoniem: false,
                    aangemaakt_op: new Date('2024-01-01'),
                    gewijzigd_op: new Date('2024-01-01'),
                },
                {
                    id: 2,
                    dossier_nummer: '1001',
                    gebruiker_id: userId,
                    status: true,
                    is_anoniem: false,
                    aangemaakt_op: new Date('2024-01-02'),
                    gewijzigd_op: new Date('2024-01-02'),
                },
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            // Act
            const result = await repository.findByUserId(userId);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('userId', userId);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
            expect(result[0].dossierNummer).toBe('1000');
            expect(result[1].id).toBe(2);
        });

        it('should return empty array when user has no dossiers', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findByUserId(999);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should return a dossier by ID', async () => {
            // Arrange
            const dossierId = 1;
            const mockRecord = {
                id: dossierId,
                dossier_nummer: '1000',
                gebruiker_id: 123,
                status: false,
                is_anoniem: false,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01'),
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.findById(dossierId);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', dossierId);
            expect(result).not.toBeNull();
            expect(result?.id).toBe(dossierId);
            expect(result?.dossierNummer).toBe('1000');
        });

        it('should return null when dossier does not exist', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findById(999);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('checkAccess', () => {
        it('should return true when user is the owner', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            // Act
            const result = await repository.checkAccess(1, 123);

            // Assert
            expect(result).toBe(true);
        });

        it('should return true when user has shared access', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            // Act
            const result = await repository.checkAccess(1, 456);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when user does not have access', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            // Act
            const result = await repository.checkAccess(1, 999);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('isOwner', () => {
        it('should return true when user is the owner', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            // Act
            const result = await repository.isOwner(1, 123);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when user is not the owner', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            // Act
            const result = await repository.isOwner(1, 456);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when user has shared access but is not owner', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            // Act
            const result = await repository.isOwner(1, 456);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('create', () => {
        it('should create a new dossier', async () => {
            // Arrange
            const userId = 123;
            const mockRecord = {
                id: 1,
                dossier_nummer: '1000',
                gebruiker_id: userId,
                status: false,
                is_anoniem: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01'),
            };

            // Mock generateNextDossierNumber (first query)
            mockRequest.query
                .mockResolvedValueOnce({ recordset: [{ maxNumber: 999 }] })
                .mockResolvedValueOnce({ recordset: [mockRecord] });

            // Act
            const result = await repository.create(userId);

            // Assert
            expect(result.id).toBe(1);
            expect(result.dossierNummer).toBe('1000');
            expect(result.gebruikerId).toBe(userId);
            expect(result.status).toBe(false);
        });

        it('should handle errors during creation', async () => {
            // Arrange
            mockRequest.query.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(repository.create(123)).rejects.toThrow('Database error');
        });
    });

    describe('updateStatus', () => {
        it('should update dossier status', async () => {
            // Arrange
            const dossierId = 1;
            const newStatus = true;
            const mockRecord = {
                id: dossierId,
                dossier_nummer: '1000',
                gebruiker_id: 123,
                status: newStatus,
                is_anoniem: false,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-02'),
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.updateStatus(dossierId, newStatus);

            // Assert
            expect(result.status).toBe(newStatus);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', dossierId);
            expect(mockRequest.input).toHaveBeenCalledWith('status', newStatus);
        });

        it('should throw error when dossier not found', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act & Assert
            await expect(repository.updateStatus(999, true)).rejects.toThrow(
                'Dossier with ID 999 not found'
            );
        });
    });

    describe('updateAnonymity', () => {
        it('should update dossier anonymity', async () => {
            // Arrange
            const dossierId = 1;
            const isAnoniem = true;
            const mockRecord = {
                id: dossierId,
                dossier_nummer: '1000',
                gebruiker_id: 123,
                status: false,
                is_anoniem: isAnoniem,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-02'),
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.updateAnonymity(dossierId, isAnoniem);

            // Assert
            expect(result.isAnoniem).toBe(isAnoniem);
        });
    });

    describe('generateNextDossierNumber', () => {
        it('should generate next sequential number', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ maxNumber: 1005 }] });

            // Act
            const result = await repository.generateNextDossierNumber();

            // Assert
            expect(result).toBe('1006');
        });

        it('should return 1000 when no dossiers exist', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ maxNumber: null }] });

            // Act
            const result = await repository.generateNextDossierNumber();

            // Assert
            expect(result).toBe('1000');
        });

        it('should fallback to timestamp on error', async () => {
            // Arrange
            mockRequest.query.mockRejectedValue(new Error('Database error'));
            const beforeTimestamp = Date.now();

            // Act
            const result = await repository.generateNextDossierNumber();

            // Assert
            const afterTimestamp = Date.now();
            const resultNumber = parseInt(result);
            expect(resultNumber).toBeGreaterThanOrEqual(beforeTimestamp);
            expect(resultNumber).toBeLessThanOrEqual(afterTimestamp);
        });
    });
});
