import { LookupRepository } from '../../repositories/LookupRepository';
import * as database from '../../config/database';

// Mock the database module
jest.mock('../../config/database');

describe('LookupRepository', () => {
    let repository: LookupRepository;
    let mockPool: any;
    let mockRequest: any;

    beforeEach(() => {
        repository = new LookupRepository();

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

    describe('Rollen (Roles)', () => {
        describe('getRollen', () => {
            it('should return all roles', async () => {
                // Arrange
                const mockRoles = [
                    { id: 1, naam: 'Admin' },
                    { id: 2, naam: 'Mediator' },
                    { id: 3, naam: 'Gebruiker' },
                ];
                mockRequest.query.mockResolvedValue({ recordset: mockRoles });

                // Act
                const result = await repository.getRollen();

                // Assert
                expect(result).toEqual(mockRoles);
                expect(result).toHaveLength(3);
                expect(mockRequest.input).not.toHaveBeenCalled(); // No parameters
            });

            it('should return empty array when no roles found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getRollen();

                // Assert
                expect(result).toEqual([]);
                expect(result).toHaveLength(0);
            });
        });

        describe('getRolById', () => {
            it('should return a role by ID', async () => {
                // Arrange
                const mockRole = { id: 1, naam: 'Admin' };
                mockRequest.query.mockResolvedValue({ recordset: [mockRole] });

                // Act
                const result = await repository.getRolById(1);

                // Assert
                expect(mockRequest.input).toHaveBeenCalledWith('rolId', 1);
                expect(result).toEqual(mockRole);
                expect(result?.naam).toBe('Admin');
            });

            it('should return null when role not found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getRolById(999);

                // Assert
                expect(result).toBeNull();
            });
        });
    });

    describe('RelatieTypes (Relationship Types)', () => {
        describe('getRelatieTypes', () => {
            it('should return all relationship types', async () => {
                // Arrange
                const mockTypes = [
                    { id: 1, naam: 'Ouder' },
                    { id: 2, naam: 'Voogd' },
                    { id: 3, naam: 'Verzorger' },
                ];
                mockRequest.query.mockResolvedValue({ recordset: mockTypes });

                // Act
                const result = await repository.getRelatieTypes();

                // Assert
                expect(result).toEqual(mockTypes);
                expect(result).toHaveLength(3);
            });

            it('should return empty array when no types found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getRelatieTypes();

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('getRelatieTypeById', () => {
            it('should return a relationship type by ID', async () => {
                // Arrange
                const mockType = { id: 1, naam: 'Ouder' };
                mockRequest.query.mockResolvedValue({ recordset: [mockType] });

                // Act
                const result = await repository.getRelatieTypeById(1);

                // Assert
                expect(mockRequest.input).toHaveBeenCalledWith('relatieTypeId', 1);
                expect(result).toEqual(mockType);
            });

            it('should return null when type not found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getRelatieTypeById(999);

                // Assert
                expect(result).toBeNull();
            });
        });
    });

    describe('Dagen (Days)', () => {
        describe('getAllDagen', () => {
            it('should return all days', async () => {
                // Arrange
                const mockDays = [
                    { id: 1, naam: 'Maandag' },
                    { id: 2, naam: 'Dinsdag' },
                    { id: 3, naam: 'Woensdag' },
                ];
                mockRequest.query.mockResolvedValue({ recordset: mockDays });

                // Act
                const result = await repository.getAllDagen();

                // Assert
                expect(result).toEqual(mockDays);
                expect(result).toHaveLength(3);
            });

            it('should return empty array when no days found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getAllDagen();

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('getDagById', () => {
            it('should return a day by ID', async () => {
                // Arrange
                const mockDay = { id: 1, naam: 'Maandag' };
                mockRequest.query.mockResolvedValue({ recordset: [mockDay] });

                // Act
                const result = await repository.getDagById(1);

                // Assert
                expect(mockRequest.input).toHaveBeenCalledWith('dagId', 1);
                expect(result).toEqual(mockDay);
            });

            it('should return null when day not found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getDagById(999);

                // Assert
                expect(result).toBeNull();
            });
        });
    });

    describe('Dagdelen (Day Parts)', () => {
        describe('getAllDagdelen', () => {
            it('should return all day parts', async () => {
                // Arrange
                const mockParts = [
                    { id: 1, naam: 'Ochtend' },
                    { id: 2, naam: 'Middag' },
                    { id: 3, naam: 'Avond' },
                ];
                mockRequest.query.mockResolvedValue({ recordset: mockParts });

                // Act
                const result = await repository.getAllDagdelen();

                // Assert
                expect(result).toEqual(mockParts);
                expect(result).toHaveLength(3);
            });

            it('should return empty array when no parts found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getAllDagdelen();

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('getDagdeelById', () => {
            it('should return a day part by ID', async () => {
                // Arrange
                const mockPart = { id: 1, naam: 'Ochtend' };
                mockRequest.query.mockResolvedValue({ recordset: [mockPart] });

                // Act
                const result = await repository.getDagdeelById(1);

                // Assert
                expect(mockRequest.input).toHaveBeenCalledWith('dagdeelId', 1);
                expect(result).toEqual(mockPart);
            });

            it('should return null when part not found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getDagdeelById(999);

                // Assert
                expect(result).toBeNull();
            });
        });
    });

    describe('WeekRegelingen (Week Arrangements)', () => {
        describe('getAllWeekRegelingen', () => {
            it('should return all week arrangements', async () => {
                // Arrange
                const mockArrangements = [
                    { id: 1, omschrijving: 'Standaard 50/50' },
                    { id: 2, omschrijving: '60/40 verdeling' },
                    { id: 3, omschrijving: 'Weekend regeling' },
                ];
                mockRequest.query.mockResolvedValue({ recordset: mockArrangements });

                // Act
                const result = await repository.getAllWeekRegelingen();

                // Assert
                expect(result).toEqual(mockArrangements);
                expect(result).toHaveLength(3);
            });

            it('should return empty array when no arrangements found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getAllWeekRegelingen();

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('getWeekRegelingById', () => {
            it('should return a week arrangement by ID', async () => {
                // Arrange
                const mockArrangement = { id: 1, omschrijving: 'Standaard 50/50' };
                mockRequest.query.mockResolvedValue({ recordset: [mockArrangement] });

                // Act
                const result = await repository.getWeekRegelingById(1);

                // Assert
                expect(mockRequest.input).toHaveBeenCalledWith('regelingId', 1);
                expect(result).toEqual(mockArrangement);
            });

            it('should return null when arrangement not found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getWeekRegelingById(999);

                // Assert
                expect(result).toBeNull();
            });
        });
    });

    describe('ZorgCategorieen (Care Categories)', () => {
        describe('getZorgCategorieen', () => {
            it('should return all care categories', async () => {
                // Arrange
                const mockCategories = [
                    { id: 1, naam: 'Medische zorg' },
                    { id: 2, naam: 'Onderwijs' },
                    { id: 3, naam: 'Opvoeding' },
                ];
                mockRequest.query.mockResolvedValue({ recordset: mockCategories });

                // Act
                const result = await repository.getZorgCategorieen();

                // Assert
                expect(result).toEqual(mockCategories);
                expect(result).toHaveLength(3);
            });

            it('should return empty array when no categories found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getZorgCategorieen();

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('getZorgCategorieById', () => {
            it('should return a care category by ID', async () => {
                // Arrange
                const mockCategory = { id: 1, naam: 'Medische zorg' };
                mockRequest.query.mockResolvedValue({ recordset: [mockCategory] });

                // Act
                const result = await repository.getZorgCategorieById(1);

                // Assert
                expect(mockRequest.input).toHaveBeenCalledWith('categorieId', 1);
                expect(result).toEqual(mockCategory);
            });

            it('should return null when category not found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getZorgCategorieById(999);

                // Assert
                expect(result).toBeNull();
            });
        });
    });

    describe('ZorgSituaties (Care Situations)', () => {
        describe('getZorgSituaties', () => {
            it('should return all care situations', async () => {
                // Arrange
                const mockSituations = [
                    { id: 1, naam: 'Huisarts bezoek', zorgCategorieId: 1 },
                    { id: 2, naam: 'Schoolkeuze', zorgCategorieId: 2 },
                    { id: 3, naam: 'Opvoedingsadvies', zorgCategorieId: 3 },
                ];
                mockRequest.query.mockResolvedValue({ recordset: mockSituations });

                // Act
                const result = await repository.getZorgSituaties();

                // Assert
                expect(result).toEqual(mockSituations);
                expect(result).toHaveLength(3);
            });

            it('should return empty array when no situations found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getZorgSituaties();

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('getZorgSituatiesForCategorie', () => {
            it('should return care situations for a specific category', async () => {
                // Arrange
                const mockSituations = [
                    { id: 1, naam: 'Huisarts bezoek', zorgCategorieId: 1 },
                    { id: 2, naam: 'Specialist bezoek', zorgCategorieId: 1 },
                ];
                mockRequest.query.mockResolvedValue({ recordset: mockSituations });

                // Act
                const result = await repository.getZorgSituatiesForCategorie(1);

                // Assert
                expect(mockRequest.input).toHaveBeenCalledWith('categorieId', 1);
                expect(result).toEqual(mockSituations);
                expect(result).toHaveLength(2);
                expect(result.every(s => s.zorgCategorieId === 1)).toBe(true);
            });

            it('should return empty array when no situations for category', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getZorgSituatiesForCategorie(999);

                // Assert
                expect(result).toEqual([]);
            });
        });

        describe('getZorgSituatieById', () => {
            it('should return a care situation by ID', async () => {
                // Arrange
                const mockSituation = { id: 1, naam: 'Huisarts bezoek', zorgCategorieId: 1 };
                mockRequest.query.mockResolvedValue({ recordset: [mockSituation] });

                // Act
                const result = await repository.getZorgSituatieById(1);

                // Assert
                expect(mockRequest.input).toHaveBeenCalledWith('situatieId', 1);
                expect(result).toEqual(mockSituation);
            });

            it('should return null when situation not found', async () => {
                // Arrange
                mockRequest.query.mockResolvedValue({ recordset: [] });

                // Act
                const result = await repository.getZorgSituatieById(999);

                // Assert
                expect(result).toBeNull();
            });
        });
    });

    describe('Error Handling', () => {
        it('should propagate database errors on getRollen', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            mockRequest.query.mockRejectedValue(dbError);

            // Act & Assert
            await expect(repository.getRollen()).rejects.toThrow('Database connection failed');
        });

        it('should propagate database errors on getRolById', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            mockRequest.query.mockRejectedValue(dbError);

            // Act & Assert
            await expect(repository.getRolById(1)).rejects.toThrow('Database connection failed');
        });

        it('should propagate database errors on getZorgSituaties', async () => {
            // Arrange
            const dbError = new Error('Database connection failed');
            mockRequest.query.mockRejectedValue(dbError);

            // Act & Assert
            await expect(repository.getZorgSituaties()).rejects.toThrow('Database connection failed');
        });
    });
});
