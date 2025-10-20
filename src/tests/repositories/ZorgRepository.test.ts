import { ZorgRepository } from '../../repositories/ZorgRepository';
import { CreateZorgDto, UpdateZorgDto } from '../../repositories/interfaces/IZorgRepository';

// Mock the database module
jest.mock('../../config/database');

describe('ZorgRepository', () => {
    let repository: ZorgRepository;
    let mockPool: any;
    let mockRequest: any;

    beforeEach(() => {
        // Create mock request object
        mockRequest = {
            input: jest.fn().mockReturnThis(),
            query: jest.fn(),
        };

        // Create mock pool
        mockPool = {
            request: jest.fn().mockReturnValue(mockRequest),
            connected: true,
            connect: jest.fn().mockResolvedValue(mockPool),
            close: jest.fn().mockResolvedValue(undefined),
        };

        // Mock the getPool function
        const { getPool } = require('../../config/database');
        getPool.mockResolvedValue(mockPool);

        repository = new ZorgRepository();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findByDossierId', () => {
        it('should find all zorg by dossier ID with categories and situaties', async () => {
            const mockRecords = [
                {
                    id: 1,
                    dossier_id: 100,
                    zorg_categorie_id: 10,
                    zorg_situatie_id: 20,
                    overeenkomst: 'Kind woont 50% bij beide ouders',
                    situatie_anders: null,
                    aangemaakt_op: new Date('2024-01-01'),
                    aangemaakt_door: 5,
                    gewijzigd_op: new Date('2024-01-15'),
                    gewijzigd_door: 5,
                    // Categorie fields
                    categorie_id: 10,
                    categorie_naam: 'Hoofdverblijf',
                    // Situatie fields
                    situatie_id: 20,
                    situatie_naam: '50/50 verdeling',
                    situatie_categorie_id: 10
                },
                {
                    id: 2,
                    dossier_id: 100,
                    zorg_categorie_id: 11,
                    zorg_situatie_id: 21,
                    overeenkomst: 'Beide ouders hebben volledige informatieplicht',
                    situatie_anders: null,
                    aangemaakt_op: new Date('2024-01-02'),
                    aangemaakt_door: 5,
                    gewijzigd_op: new Date('2024-01-16'),
                    gewijzigd_door: null,
                    // Categorie fields
                    categorie_id: 11,
                    categorie_naam: 'Informatie',
                    // Situatie fields
                    situatie_id: 21,
                    situatie_naam: 'Volledige informatieplicht',
                    situatie_categorie_id: 11
                }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            const result = await repository.findByDossierId(100);

            expect(result).toHaveLength(2);
            expect(result[0].zorg.id).toBe(1);
            expect(result[0].zorg.dossierId).toBe(100);
            expect(result[0].categorie.naam).toBe('Hoofdverblijf');
            expect(result[0].situatie.naam).toBe('50/50 verdeling');
            expect(result[1].zorg.id).toBe(2);
            expect(result[1].categorie.naam).toBe('Informatie');
        });

        it('should return empty array when no zorg found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.findByDossierId(999);

            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should find zorg by ID with categorie and situatie', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 10,
                zorg_situatie_id: 20,
                overeenkomst: 'Kind woont 50% bij beide ouders',
                situatie_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-15'),
                gewijzigd_door: 5,
                // Categorie fields
                categorie_id: 10,
                categorie_naam: 'Hoofdverblijf',
                // Situatie fields
                situatie_id: 20,
                situatie_naam: '50/50 verdeling',
                situatie_categorie_id: 10
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result).not.toBeNull();
            expect(result?.zorg.id).toBe(1);
            expect(result?.zorg.overeenkomst).toBe('Kind woont 50% bij beide ouders');
            expect(result?.categorie.naam).toBe('Hoofdverblijf');
            expect(result?.situatie.naam).toBe('50/50 verdeling');
        });

        it('should return null when zorg not found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.findById(999);

            expect(result).toBeNull();
        });
    });

    describe('findByCategorie', () => {
        it('should find all zorg by categorie in a dossier', async () => {
            const mockRecords = [
                {
                    id: 1,
                    dossier_id: 100,
                    zorg_categorie_id: 10,
                    zorg_situatie_id: 20,
                    overeenkomst: 'Kind woont 50% bij beide ouders',
                    situatie_anders: null,
                    aangemaakt_op: new Date('2024-01-01'),
                    aangemaakt_door: 5,
                    gewijzigd_op: new Date('2024-01-15'),
                    gewijzigd_door: 5,
                    categorie_id: 10,
                    categorie_naam: 'Hoofdverblijf',
                    situatie_id: 20,
                    situatie_naam: '50/50 verdeling',
                    situatie_categorie_id: 10
                }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            const result = await repository.findByCategorie(100, 10);

            expect(result).toHaveLength(1);
            expect(result[0].zorg.zorgCategorieId).toBe(10);
            expect(result[0].categorie.naam).toBe('Hoofdverblijf');
        });

        it('should return empty array when no zorg found for categorie', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.findByCategorie(100, 999);

            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        it('should create new zorg successfully', async () => {
            const createDto: CreateZorgDto = {
                dossierId: 100,
                zorgCategorieId: 10,
                zorgSituatieId: 20,
                overeenkomst: 'Kind woont 50% bij beide ouders',
                situatieAnders: undefined,
                aangemaaktDoor: 5
            };

            const mockInserted = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 10,
                zorg_situatie_id: 20,
                overeenkomst: 'Kind woont 50% bij beide ouders',
                situatie_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-01'),
                gewijzigd_door: null
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockInserted] });

            const result = await repository.create(createDto);

            expect(result.id).toBe(1);
            expect(result.dossierId).toBe(100);
            expect(result.zorgCategorieId).toBe(10);
            expect(result.zorgSituatieId).toBe(20);
            expect(result.aangemaaktDoor).toBe(5);
        });

        it('should create zorg with situatieAnders', async () => {
            const createDto: CreateZorgDto = {
                dossierId: 100,
                zorgCategorieId: 10,
                zorgSituatieId: 20,
                overeenkomst: 'Custom arrangement',
                situatieAnders: 'Special case details',
                aangemaaktDoor: 5
            };

            const mockInserted = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 10,
                zorg_situatie_id: 20,
                overeenkomst: 'Custom arrangement',
                situatie_anders: 'Special case details',
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-01'),
                gewijzigd_door: null
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockInserted] });

            const result = await repository.create(createDto);

            expect(result.situatieAnders).toBe('Special case details');
        });

        it('should throw error if create fails', async () => {
            const createDto: CreateZorgDto = {
                dossierId: 100,
                zorgCategorieId: 10,
                zorgSituatieId: 20,
                overeenkomst: 'Test',
                aangemaaktDoor: 5
            };

            mockRequest.query.mockResolvedValue({ recordset: [] });

            await expect(repository.create(createDto)).rejects.toThrow('Failed to create zorg record');
        });
    });

    describe('update', () => {
        it('should update zorg successfully', async () => {
            const updateDto: UpdateZorgDto = {
                overeenkomst: 'Updated arrangement',
                gewijzigdDoor: 6
            };

            const mockUpdated = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 10,
                zorg_situatie_id: 20,
                overeenkomst: 'Updated arrangement',
                situatie_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-20'),
                gewijzigd_door: 6
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockUpdated] });

            const result = await repository.update(1, updateDto);

            expect(result.overeenkomst).toBe('Updated arrangement');
            expect(result.gewijzigdDoor).toBe(6);
        });

        it('should update multiple fields', async () => {
            const updateDto: UpdateZorgDto = {
                zorgCategorieId: 11,
                zorgSituatieId: 21,
                overeenkomst: 'New arrangement',
                situatieAnders: 'New details',
                gewijzigdDoor: 6
            };

            const mockUpdated = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 11,
                zorg_situatie_id: 21,
                overeenkomst: 'New arrangement',
                situatie_anders: 'New details',
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-20'),
                gewijzigd_door: 6
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockUpdated] });

            const result = await repository.update(1, updateDto);

            expect(result.zorgCategorieId).toBe(11);
            expect(result.zorgSituatieId).toBe(21);
            expect(result.overeenkomst).toBe('New arrangement');
            expect(result.situatieAnders).toBe('New details');
        });

        it('should throw error when no fields to update', async () => {
            const updateDto: UpdateZorgDto = {
                gewijzigdDoor: 6
            };

            await expect(repository.update(1, updateDto)).rejects.toThrow('No fields provided for update');
        });

        it('should throw error when zorg not found', async () => {
            const updateDto: UpdateZorgDto = {
                overeenkomst: 'Updated',
                gewijzigdDoor: 6
            };

            mockRequest.query.mockResolvedValue({ recordset: [] });

            await expect(repository.update(999, updateDto)).rejects.toThrow('Zorg with ID 999 not found');
        });
    });

    describe('delete', () => {
        it('should delete zorg successfully', async () => {
            mockRequest.query.mockResolvedValue({ rowsAffected: [1] });

            const result = await repository.delete(1);

            expect(result).toBe(true);
        });

        it('should return false when zorg not found', async () => {
            mockRequest.query.mockResolvedValue({ rowsAffected: [0] });

            const result = await repository.delete(999);

            expect(result).toBe(false);
        });
    });

    describe('zorgExists', () => {
        it('should return true when zorg exists', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            const result = await repository.zorgExists(1);

            expect(result).toBe(true);
        });

        it('should return false when zorg does not exist', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            const result = await repository.zorgExists(999);

            expect(result).toBe(false);
        });

        it('should return false when no results', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.zorgExists(999);

            expect(result).toBe(false);
        });
    });

    describe('count', () => {
        it('should count zorg in dossier', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 5 }] });

            const result = await repository.count(100);

            expect(result).toBe(5);
        });

        it('should return 0 when no zorg found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            const result = await repository.count(999);

            expect(result).toBe(0);
        });

        it('should return 0 when no results', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.count(999);

            expect(result).toBe(0);
        });
    });

    describe('validateSituatieForCategorie', () => {
        it('should return true when situatie belongs to categorie', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            const result = await repository.validateSituatieForCategorie(20, 10);

            expect(result).toBe(true);
        });

        it('should return false when situatie does not belong to categorie', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            const result = await repository.validateSituatieForCategorie(20, 99);

            expect(result).toBe(false);
        });

        it('should return false when no results', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.validateSituatieForCategorie(999, 10);

            expect(result).toBe(false);
        });
    });

    describe('getAllCategorieen', () => {
        it('should get all zorg categorieën', async () => {
            const mockCategorieen = [
                { id: 10, naam: 'Hoofdverblijf' },
                { id: 11, naam: 'Informatie' },
                { id: 12, naam: 'Vakantieverdeling' }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockCategorieen });

            const result = await repository.getAllCategorieen();

            expect(result).toHaveLength(3);
            expect(result[0].id).toBe(10);
            expect(result[0].naam).toBe('Hoofdverblijf');
            expect(result[1].naam).toBe('Informatie');
        });

        it('should return empty array when no categorieën found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.getAllCategorieen();

            expect(result).toEqual([]);
        });
    });

    describe('getSituatiesForCategorie', () => {
        it('should get situaties for specific categorie', async () => {
            const mockSituaties = [
                { id: 20, naam: '50/50 verdeling', zorg_categorie_id: 10 },
                { id: 21, naam: 'Hoofdverblijf bij moeder', zorg_categorie_id: 10 },
                { id: 22, naam: 'Anders', zorg_categorie_id: null }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockSituaties });

            const result = await repository.getSituatiesForCategorie(10);

            expect(result).toHaveLength(3);
            expect(result[0].naam).toBe('50/50 verdeling');
            expect(result[0].zorgCategorieId).toBe(10);
            expect(result[2].zorgCategorieId).toBeUndefined(); // NULL becomes undefined
        });

        it('should return empty array when no situaties found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.getSituatiesForCategorie(999);

            expect(result).toEqual([]);
        });
    });

    describe('Data Mapping', () => {
        it('should handle null situatie_anders correctly', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 10,
                zorg_situatie_id: 20,
                overeenkomst: 'Test',
                situatie_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-01'),
                gewijzigd_door: null,
                categorie_id: 10,
                categorie_naam: 'Test',
                situatie_id: 20,
                situatie_naam: 'Test',
                situatie_categorie_id: 10
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result?.zorg.situatieAnders).toBeUndefined();
        });

        it('should handle null gewijzigd_door correctly', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 10,
                zorg_situatie_id: 20,
                overeenkomst: 'Test',
                situatie_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-01'),
                gewijzigd_door: null,
                categorie_id: 10,
                categorie_naam: 'Test',
                situatie_id: 20,
                situatie_naam: 'Test',
                situatie_categorie_id: 10
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result?.zorg.gewijzigdDoor).toBeUndefined();
        });

        it('should handle null zorg_categorie_id in situatie', async () => {
            const mockSituatie = {
                id: 22,
                naam: 'Universal situatie',
                zorg_categorie_id: null
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockSituatie] });

            const result = await repository.getSituatiesForCategorie(10);

            expect(result[0].zorgCategorieId).toBeUndefined();
        });
    });

    describe('Audit Trail', () => {
        it('should set aangemaaktDoor on create', async () => {
            const createDto: CreateZorgDto = {
                dossierId: 100,
                zorgCategorieId: 10,
                zorgSituatieId: 20,
                overeenkomst: 'Test',
                aangemaaktDoor: 5
            };

            const mockInserted = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 10,
                zorg_situatie_id: 20,
                overeenkomst: 'Test',
                situatie_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-01'),
                gewijzigd_door: null
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockInserted] });

            const result = await repository.create(createDto);

            expect(result.aangemaaktDoor).toBe(5);
        });

        it('should set gewijzigdDoor on update', async () => {
            const updateDto: UpdateZorgDto = {
                overeenkomst: 'Updated',
                gewijzigdDoor: 6
            };

            const mockUpdated = {
                id: 1,
                dossier_id: 100,
                zorg_categorie_id: 10,
                zorg_situatie_id: 20,
                overeenkomst: 'Updated',
                situatie_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                aangemaakt_door: 5,
                gewijzigd_op: new Date('2024-01-20'),
                gewijzigd_door: 6
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockUpdated] });

            const result = await repository.update(1, updateDto);

            expect(result.gewijzigdDoor).toBe(6);
        });
    });
});
