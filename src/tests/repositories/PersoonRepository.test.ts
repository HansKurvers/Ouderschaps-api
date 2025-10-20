import { PersoonRepository } from '../../repositories/PersoonRepository';
import * as database from '../../config/database';

// Mock the database module
jest.mock('../../config/database');

describe('PersoonRepository', () => {
    let repository: PersoonRepository;
    let mockPool: any;
    let mockRequest: any;

    beforeEach(() => {
        repository = new PersoonRepository();

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

    describe('findById', () => {
        it('should return a person by ID', async () => {
            // Arrange
            const personId = 1;
            const mockRecord = {
                id: personId,
                voorletters: 'J.',
                voornamen: 'John',
                roepnaam: 'Johnny',
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
                rol_id: null,
                rol_naam: null,
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.findById(personId);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('id', personId);
            expect(result).not.toBeNull();
            expect(result?.id).toBe(personId);
            expect(result?.achternaam).toBe('Doe');
            expect(result?.voornamen).toBe('John');
            expect(result?.email).toBe('john@example.com');
        });

        it('should return null when person not found', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findById(999);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('findAll', () => {
        it('should return all persons with default pagination', async () => {
            // Arrange
            const mockRecords = [
                {
                    id: 1,
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
                },
                {
                    id: 2,
                    voorletters: 'J.',
                    voornamen: 'Jane',
                    roepnaam: null,
                    geslacht: 'Vrouw',
                    tussenvoegsel: null,
                    achternaam: 'Smith',
                    adres: null,
                    postcode: null,
                    plaats: null,
                    geboorteplaats: null,
                    geboorte_datum: null,
                    nationaliteit_1: null,
                    nationaliteit_2: null,
                    telefoon: null,
                    email: 'jane@example.com',
                    beroep: null,
                },
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            // Act
            const result = await repository.findAll();

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('limit', 50);
            expect(mockRequest.input).toHaveBeenCalledWith('offset', 0);
            expect(result).toHaveLength(2);
            expect(result[0].achternaam).toBe('Doe');
            expect(result[1].achternaam).toBe('Smith');
        });

        it('should support custom pagination', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            await repository.findAll({ limit: 25, offset: 50 });

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('limit', 25);
            expect(mockRequest.input).toHaveBeenCalledWith('offset', 50);
        });

        it('should enforce maximum limit of 100', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            await repository.findAll({ limit: 200 });

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('limit', 100);
        });

        it('should return empty array when no persons exist', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findAll();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('findByEmail', () => {
        it('should return person by email', async () => {
            // Arrange
            const mockRecord = {
                id: 1,
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
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.findByEmail('john@example.com');

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('email', 'john@example.com');
            expect(result).not.toBeNull();
            expect(result?.email).toBe('john@example.com');
        });

        it('should return null when email not found', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findByEmail('notfound@example.com');

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('findByAchternaam', () => {
        it('should find persons by partial last name match', async () => {
            // Arrange
            const mockRecords = [
                {
                    id: 1,
                    voorletters: 'J.',
                    voornamen: 'John',
                    roepnaam: null,
                    geslacht: null,
                    tussenvoegsel: null,
                    achternaam: 'Jansen',
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
                },
                {
                    id: 2,
                    voorletters: 'P.',
                    voornamen: 'Piet',
                    roepnaam: null,
                    geslacht: null,
                    tussenvoegsel: null,
                    achternaam: 'Janssen',
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
                },
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            // Act
            const result = await repository.findByAchternaam('Jans');

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('achternaam', '%Jans%');
            expect(result).toHaveLength(2);
            expect(result[0].achternaam).toBe('Jansen');
            expect(result[1].achternaam).toBe('Janssen');
        });

        it('should return empty array when no matches found', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.findByAchternaam('Nonexistent');

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('checkEmailUnique', () => {
        it('should return true when email is unique', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            // Act
            const result = await repository.checkEmailUnique('unique@example.com');

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when email already exists', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            // Act
            const result = await repository.checkEmailUnique('existing@example.com');

            // Assert
            expect(result).toBe(false);
        });

        it('should exclude specified person ID from uniqueness check', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            // Act
            const result = await repository.checkEmailUnique('john@example.com', 123);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('email', 'john@example.com');
            expect(mockRequest.input).toHaveBeenCalledWith('excludeId', 123);
            expect(result).toBe(true);
        });
    });

    describe('create', () => {
        it('should create a new person', async () => {
            // Arrange
            const newPersonData = {
                voorletters: 'J.',
                voornamen: 'John',
                achternaam: 'Doe',
                email: 'john@example.com',
                telefoon: '0612345678',
            };

            const mockRecord = {
                id: 1,
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
                telefoon: '0612345678',
                email: 'john@example.com',
                beroep: null,
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            // Act
            const result = await repository.create(newPersonData);

            // Assert
            expect(result.id).toBe(1);
            expect(result.achternaam).toBe('Doe');
            expect(result.email).toBe('john@example.com');
            expect(mockRequest.input).toHaveBeenCalledWith('achternaam', 'Doe');
            expect(mockRequest.input).toHaveBeenCalledWith('email', 'john@example.com');
        });

        it('should throw error when achternaam is missing', async () => {
            // Arrange
            const invalidData = {
                voornamen: 'John',
                email: 'john@example.com',
            };

            // Act & Assert
            await expect(repository.create(invalidData)).rejects.toThrow(
                'Achternaam is required to create a person'
            );
        });

        it('should handle database errors during creation', async () => {
            // Arrange
            const newPersonData = {
                achternaam: 'Doe',
                email: 'john@example.com',
            };

            mockRequest.query.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(repository.create(newPersonData)).rejects.toThrow('Database error');
        });
    });

    describe('update', () => {
        it('should update an existing person', async () => {
            // Arrange
            const personId = 1;
            const existingPerson = {
                id: personId,
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
                telefoon: '0612345678',
                email: 'old@example.com',
                beroep: null,
            };

            const updatedPerson = {
                ...existingPerson,
                email: 'new@example.com',
                telefoon: '0687654321',
            };

            // First query: findById
            // Second query: update
            mockRequest.query
                .mockResolvedValueOnce({ recordset: [existingPerson] })
                .mockResolvedValueOnce({ recordset: [updatedPerson] });

            // Act
            const result = await repository.update(personId, {
                email: 'new@example.com',
                telefoon: '0687654321',
            });

            // Assert
            expect(result.email).toBe('new@example.com');
            expect(result.telefoon).toBe('0687654321');
        });

        it('should throw error when person not found', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act & Assert
            await expect(
                repository.update(999, { email: 'new@example.com' })
            ).rejects.toThrow('Person with ID 999 not found');
        });
    });

    describe('delete', () => {
        it('should delete a person successfully', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ rowsAffected: [1] });

            // Act
            const result = await repository.delete(1);

            // Assert
            expect(mockRequest.input).toHaveBeenCalledWith('id', 1);
            expect(result).toBe(true);
        });

        it('should return false when person not found', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ rowsAffected: [0] });

            // Act
            const result = await repository.delete(999);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('count', () => {
        it('should return total count of persons', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ total: 42 }] });

            // Act
            const result = await repository.count();

            // Assert
            expect(result).toBe(42);
        });

        it('should return 0 when no persons exist', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [{ total: 0 }] });

            // Act
            const result = await repository.count();

            // Assert
            expect(result).toBe(0);
        });

        it('should return 0 when query returns null', async () => {
            // Arrange
            mockRequest.query.mockResolvedValue({ recordset: [] });

            // Act
            const result = await repository.count();

            // Assert
            expect(result).toBe(0);
        });
    });

    describe('checkDependencies', () => {
        it('should return no dependencies when person is not linked anywhere', async () => {
            // Arrange
            const personId = 1;
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            // Act
            const result = await repository.checkDependencies(personId);

            // Assert
            expect(result.hasDependencies).toBe(false);
            expect(result.message).toBe('');
            expect(result.dependencies).toEqual({
                dossiers_partijen: 0,
                dossiers_kinderen: 0,
                kinderen_ouders_als_kind: 0,
                kinderen_ouders_als_ouder: 0,
                omgang: 0,
                ouderschapsplan_partij1: 0,
                ouderschapsplan_partij2: 0,
                financiele_afspraken: 0,
                bijdragen_kosten: 0
            });
        });

        it('should return dependencies when person is linked as partij', async () => {
            // Arrange
            const personId = 1;
            mockRequest.query
                .mockResolvedValueOnce({ recordset: [{ count: 2 }] }) // dossiers_partijen
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // dossiers_kinderen
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders kind
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders ouder
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // omgang
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p1
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p2
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // financiele_afspraken
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }); // bijdragen_kosten

            // Act
            const result = await repository.checkDependencies(personId);

            // Assert
            expect(result.hasDependencies).toBe(true);
            expect(result.message).toContain('2 dossier(s) as partij');
            expect(result.dependencies.dossiers_partijen).toBe(2);
        });

        it('should return multiple dependencies with combined message', async () => {
            // Arrange
            const personId = 1;
            mockRequest.query
                .mockResolvedValueOnce({ recordset: [{ count: 1 }] }) // dossiers_partijen
                .mockResolvedValueOnce({ recordset: [{ count: 1 }] }) // dossiers_kinderen
                .mockResolvedValueOnce({ recordset: [{ count: 2 }] }) // kinderen_ouders kind
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders ouder
                .mockResolvedValueOnce({ recordset: [{ count: 3 }] }) // omgang
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p1
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p2
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // financiele_afspraken
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }); // bijdragen_kosten

            // Act
            const result = await repository.checkDependencies(personId);

            // Assert
            expect(result.hasDependencies).toBe(true);
            expect(result.message).toContain('1 dossier(s) as partij');
            expect(result.message).toContain('1 dossier(s) as kind');
            expect(result.message).toContain('2 ouder relatie(s)');
            expect(result.message).toContain('3 omgang regeling(en)');
        });
    });

    describe('deleteForUser', () => {
        it('should delete person when no dependencies exist', async () => {
            // Arrange
            const personId = 1;
            const userId = 10;

            // Mock checkDependencies to return no dependencies
            mockRequest.query
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // dossiers_partijen
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // dossiers_kinderen
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders kind
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders ouder
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // omgang
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p1
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p2
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // financiele_afspraken
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }); // bijdragen_kosten

            // Mock delete
            mockRequest.query.mockResolvedValueOnce({ rowsAffected: [1] });

            // Act
            const result = await repository.deleteForUser(personId, userId);

            // Assert
            expect(result).toBe(true);
        });

        it('should throw error when person has dependencies', async () => {
            // Arrange
            const personId = 1;
            const userId = 10;

            // Mock checkDependencies to return dependencies
            mockRequest.query
                .mockResolvedValueOnce({ recordset: [{ count: 2 }] }) // dossiers_partijen
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // dossiers_kinderen
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders kind
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders ouder
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // omgang
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p1
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p2
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // financiele_afspraken
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }); // bijdragen_kosten

            // Act & Assert
            await expect(repository.deleteForUser(personId, userId)).rejects.toThrow(
                'Deze persoon kan niet worden verwijderd omdat deze nog is gekoppeld aan'
            );
        });

        it('should return false when person not found or no access', async () => {
            // Arrange
            const personId = 1;
            const userId = 10;

            // Mock checkDependencies to return no dependencies
            mockRequest.query
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // dossiers_partijen
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // dossiers_kinderen
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders kind
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // kinderen_ouders ouder
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // omgang
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p1
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // ouderschapsplan p2
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }) // financiele_afspraken
                .mockResolvedValueOnce({ recordset: [{ count: 0 }] }); // bijdragen_kosten

            // Mock delete - no rows affected
            mockRequest.query.mockResolvedValueOnce({ rowsAffected: [0] });

            // Act
            const result = await repository.deleteForUser(personId, userId);

            // Assert
            expect(result).toBe(false);
        });
    });
});
