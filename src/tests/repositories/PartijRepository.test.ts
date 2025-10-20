import { PartijRepository } from '../../repositories/PartijRepository';
import * as database from '../../config/database';

// Mock the database module
jest.mock('../../config/database');

describe('PartijRepository', () => {
    let repository: PartijRepository;
    let mockPool: any;
    let mockRequest: any;

    beforeEach(() => {
        repository = new PartijRepository();

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

    describe('findByDossierId', () => {
        it('should find all partijen by dossier ID', async () => {
            // Arrange
            const dossierId = 1;
            const mockRecords = [
                {
                    partij_id: 1,
                    id: 10,
                    voorletters: 'J.',
                    voornamen: 'John',
                    roepnaam: null,
                    geslacht: 'Man',
                    tussenvoegsel: null,
                    achternaam: 'Doe',
                    adres: '123 Main St',
                    postcode: '1234 AB',
                    plaats: 'Amsterdam',
                    geboorteplaats: 'Rotterdam',
                    geboorte_datum: new Date('1990-01-01'),
                    nationaliteit_1: 'Nederlands',
                    nationaliteit_2: null,
                    telefoon: '0612345678',
                    email: 'john@example.com',
                    beroep: 'Developer',
                    rol_id: 1,
                    rol_naam: 'Vader',
                },
                {
                    partij_id: 2,
                    id: 11,
                    voorletters: 'J.',
                    voornamen: 'Jane',
                    roepnaam: null,
                    geslacht: 'Vrouw',
                    tussenvoegsel: null,
                    achternaam: 'Smith',
                    adres: '456 Oak Ave',
                    postcode: '5678 CD',
                    plaats: 'Utrecht',
                    geboorteplaats: 'Den Haag',
                    geboorte_datum: new Date('1992-05-15'),
                    nationaliteit_1: 'Nederlands',
                    nationaliteit_2: null,
                    telefoon: '0687654321',
                    email: 'jane@example.com',
                    beroep: 'Designer',
                    rol_id: 2,
                    rol_naam: 'Moeder',
                },
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            // Act
            const result = await repository.findByDossierId(dossierId);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', dossierId);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
            expect(result[0].persoon.achternaam).toBe('Doe');
            expect(result[0].rol.naam).toBe('Vader');
            expect(result[1].id).toBe(2);
            expect(result[1].persoon.achternaam).toBe('Smith');
            expect(result[1].rol.naam).toBe('Moeder');
        });

        it('should return empty array when no partijen found', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findByDossierId(999);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should find partij by ID', async () => {
            // Arrange
            const dossierId = 1;
            const partijId = 1;
            const mockRecord = {
                partij_id: partijId,
                id: 10,
                voorletters: 'J.',
                voornamen: 'John',
                roepnaam: null,
                geslacht: 'Man',
                tussenvoegsel: null,
                achternaam: 'Doe',
                adres: null,
                postcode: null,
                plaats: null,
                geboorteplaats: null,
                geboorte_datum: null,
                nationaliteit_1: null,
                nationaliteit_2: null,
                telefoon: null,
                email: 'john@example.com',
                beroep: null,
                rol_id: 1,
                rol_naam: 'Vader',
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.findById(dossierId, partijId);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', dossierId);
            expect(mockRequest.input).toHaveBeenCalledWith('partijId', partijId);
            expect(result).not.toBeNull();
            expect(result?.id).toBe(partijId);
            expect(result?.persoon.achternaam).toBe('Doe');
            expect(result?.rol.id).toBe(1);
            expect(result?.rol.naam).toBe('Vader');
        });

        it('should return null when partij not found', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findById(1, 999);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create new partij successfully', async () => {
            // Arrange
            const dossierId = 1;
            const persoonId = 10;
            const rolId = 1;

            const mockInsertResult = { recordset: [{ id: 5 }] };
            const mockFetchedPartij = {
                partij_id: 5,
                id: persoonId,
                voorletters: 'J.',
                voornamen: 'John',
                roepnaam: null,
                geslacht: null,
                tussenvoegsel: null,
                achternaam: 'Doe',
                adres: null,
                postcode: null,
                plaats: null,
                geboorteplaats: null,
                geboorte_datum: null,
                nationaliteit_1: null,
                nationaliteit_2: null,
                telefoon: null,
                email: 'john@example.com',
                beroep: null,
                rol_id: rolId,
                rol_naam: 'Vader',
            };

            mockRequest.query
                .mockResolvedValueOnce(mockInsertResult) // INSERT
                .mockResolvedValueOnce({ recordset: [mockFetchedPartij] }); // findById

            // Act
            const result = await repository.create(dossierId, persoonId, rolId);

            // Assert
            expect(result.id).toBe(5);
            expect(result.persoon.id).toBe(persoonId);
            expect(result.rol.id).toBe(rolId);
        });

        it('should throw error when insert fails', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] }); // No ID returned

            // Act & Assert
            await expect(repository.create(1, 10, 1)).rejects.toThrow(
                'Failed to create partij: No ID returned'
            );
        });
    });

    describe('delete', () => {
        it('should delete partij successfully', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ rowsAffected: [1] });

            // Act
            const result = await repository.delete(1, 1);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('partijId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
            expect(result).toBe(true);
        });

        it('should return false when deleting non-existent partij', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ rowsAffected: [0] });

            // Act
            const result = await repository.delete(1, 999);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('partijExists', () => {
        it('should check if partij exists (returns true)', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            // Act
            const result = await repository.partijExists(1, 10, 1);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('persoonId', 10);
            expect(mockRequest.input).toHaveBeenCalledWith('rolId', 1);
            expect(result).toBe(true);
        });

        it('should check if partij exists (returns false)', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            // Act
            const result = await repository.partijExists(1, 10, 1);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('count', () => {
        it('should count partijen in dossier', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ total: 2 }] });

            // Act
            const result = await repository.count(1);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
            expect(result).toBe(2);
        });

        it('should return zero when counting empty dossier', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ total: 0 }] });

            // Act
            const result = await repository.count(999);

            // Assert
            expect(result).toBe(0);
        });

        it('should return zero when query returns null', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.count(1);

            // Assert
            expect(result).toBe(0);
        });
    });

    describe('findDossiersByPersoonId', () => {
        it('should find all dossiers for a persoon', async () => {
            // Arrange
            const persoonId = 10;
            const mockRecords = [{ dossier_id: 1 }, { dossier_id: 3 }, { dossier_id: 5 }];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            // Act
            const result = await repository.findDossiersByPersoonId(persoonId);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('persoonId', persoonId);
            expect(result).toEqual([1, 3, 5]);
        });

        it('should handle persoon in multiple dossiers', async () => {
            // Arrange
            const persoonId = 10;
            const mockRecords = [
                { dossier_id: 1 },
                { dossier_id: 2 },
                { dossier_id: 3 },
                { dossier_id: 4 },
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            // Act
            const result = await repository.findDossiersByPersoonId(persoonId);

            // Assert
            expect(result).toHaveLength(4);
            expect(result).toEqual([1, 2, 3, 4]);
        });

        it('should return empty array when persoon not in any dossier', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findDossiersByPersoonId(999);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('data mapping', () => {
        it('should map persoon data correctly with all fields', async () => {
            // Arrange
            const mockRecord = {
                partij_id: 1,
                id: 10,
                voorletters: 'J.P.',
                voornamen: 'John Peter',
                roepnaam: 'Johnny',
                geslacht: 'Man',
                tussenvoegsel: 'van',
                achternaam: 'der Berg',
                adres: 'Hoofdstraat 123',
                postcode: '1234 AB',
                plaats: 'Amsterdam',
                geboorteplaats: 'Rotterdam',
                geboorte_datum: new Date('1985-03-15'),
                nationaliteit_1: 'Nederlands',
                nationaliteit_2: 'Belgisch',
                telefoon: '0612345678',
                email: 'john@example.com',
                beroep: 'Software Engineer',
                rol_id: 1,
                rol_naam: 'Vader',
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.findById(1, 1);

            // Assert
            expect(result).not.toBeNull();
            expect(result?.persoon.voorletters).toBe('J.P.');
            expect(result?.persoon.voornamen).toBe('John Peter');
            expect(result?.persoon.roepnaam).toBe('Johnny');
            expect(result?.persoon.geslacht).toBe('Man');
            expect(result?.persoon.tussenvoegsel).toBe('van');
            expect(result?.persoon.achternaam).toBe('der Berg');
            expect(result?.persoon.adres).toBe('Hoofdstraat 123');
            expect(result?.persoon.postcode).toBe('1234 AB');
            expect(result?.persoon.plaats).toBe('Amsterdam');
            expect(result?.persoon.geboorteplaats).toBe('Rotterdam');
            expect(result?.persoon.nationaliteit1).toBe('Nederlands');
            expect(result?.persoon.nationaliteit2).toBe('Belgisch');
            expect(result?.persoon.telefoon).toBe('0612345678');
            expect(result?.persoon.email).toBe('john@example.com');
            expect(result?.persoon.beroep).toBe('Software Engineer');
        });

        it('should map rol data correctly', async () => {
            // Arrange
            const mockRecord = {
                partij_id: 1,
                id: 10,
                voorletters: 'J.',
                voornamen: 'John',
                roepnaam: null,
                geslacht: null,
                tussenvoegsel: null,
                achternaam: 'Doe',
                adres: null,
                postcode: null,
                plaats: null,
                geboorteplaats: null,
                geboorte_datum: null,
                nationaliteit_1: null,
                nationaliteit_2: null,
                telefoon: null,
                email: null,
                beroep: null,
                rol_id: 2,
                rol_naam: 'Moeder',
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.findById(1, 1);

            // Assert
            expect(result).not.toBeNull();
            expect(result?.rol).toEqual({
                id: 2,
                naam: 'Moeder',
            });
        });
    });

    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            // Arrange
            mockRequest.query.mockRejectedValue(new Error('Database connection failed'));

            // Act & Assert
            await expect(repository.findByDossierId(1)).rejects.toThrow(
                'Database connection failed'
            );
        });
    });
});
