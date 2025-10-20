import { AlimentatieRepository } from '../../repositories/AlimentatieRepository';
import * as database from '../../config/database';

// Mock the database module
jest.mock('../../config/database');

describe('AlimentatieRepository', () => {
    let repository: AlimentatieRepository;
    let mockPool: any;
    let mockRequest: any;

    beforeEach(() => {
        repository = new AlimentatieRepository();

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
        it('should find all alimentatie by dossier ID with betaler and ontvanger', async () => {
            const mockRecords = [
                {
                    id: 1,
                    dossier_id: 100,
                    betaler_id: 10,
                    ontvanger_id: 20,
                    bedrag: 500.00,
                    frequentie: 'per maand',
                    ingangsdatum: new Date('2024-01-01'),
                    einddatum: null,
                    opmerkingen: 'Test alimentatie',
                    aangemaakt_op: new Date('2024-01-01'),
                    gewijzigd_op: new Date('2024-01-01'),
                    // Betaler fields
                    betaler_voorletters: 'J.',
                    betaler_voornamen: 'John',
                    betaler_roepnaam: 'John',
                    betaler_geslacht: 'M',
                    betaler_tussenvoegsel: null,
                    betaler_achternaam: 'Doe',
                    betaler_adres: 'Street 1',
                    betaler_postcode: '1234AB',
                    betaler_plaats: 'Amsterdam',
                    betaler_geboorteplaats: 'Rotterdam',
                    betaler_geboorte_datum: new Date('1980-01-01'),
                    betaler_nationaliteit_1: 'Nederlandse',
                    betaler_nationaliteit_2: null,
                    betaler_telefoon: '0612345678',
                    betaler_email: 'john@example.com',
                    betaler_beroep: 'Engineer',
                    // Ontvanger fields
                    ontvanger_voorletters: 'J.',
                    ontvanger_voornamen: 'Jane',
                    ontvanger_roepnaam: 'Jane',
                    ontvanger_geslacht: 'V',
                    ontvanger_tussenvoegsel: null,
                    ontvanger_achternaam: 'Smith',
                    ontvanger_adres: 'Street 2',
                    ontvanger_postcode: '5678CD',
                    ontvanger_plaats: 'Utrecht',
                    ontvanger_geboorteplaats: 'Den Haag',
                    ontvanger_geboorte_datum: new Date('1985-01-01'),
                    ontvanger_nationaliteit_1: 'Nederlandse',
                    ontvanger_nationaliteit_2: null,
                    ontvanger_telefoon: '0687654321',
                    ontvanger_email: 'jane@example.com',
                    ontvanger_beroep: 'Teacher'
                }
            ];

            mockRequest.query.mockResolvedValueOnce({ recordset: mockRecords });

            const result = await repository.findByDossierId(100);

            expect(result).toHaveLength(1);
            expect(result[0].alimentatie.id).toBe(1);
            expect(result[0].alimentatie.bedrag).toBe(500.00);
            expect(result[0].alimentatie.frequentie).toBe('per maand');
            expect(result[0].betaler.id).toBe(10);
            expect(result[0].betaler.voornamen).toBe('John');
            expect(result[0].ontvanger.id).toBe(20);
            expect(result[0].ontvanger.voornamen).toBe('Jane');
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 100);
        });

        it('should return empty array when no alimentatie found', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.findByDossierId(100);

            expect(result).toEqual([]);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 100);
        });
    });

    describe('findById', () => {
        it('should find alimentatie by ID with betaler and ontvanger data', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                betaler_id: 10,
                ontvanger_id: 20,
                bedrag: 750.50,
                frequentie: 'per week',
                ingangsdatum: new Date('2024-01-01'),
                einddatum: new Date('2024-12-31'),
                opmerkingen: 'Weekly payment',
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01'),
                // Betaler fields
                betaler_voorletters: 'P.',
                betaler_voornamen: 'Peter',
                betaler_roepnaam: 'Pete',
                betaler_geslacht: 'M',
                betaler_tussenvoegsel: null,
                betaler_achternaam: 'Parker',
                betaler_adres: 'Main St 123',
                betaler_postcode: '1111AA',
                betaler_plaats: 'New York',
                betaler_geboorteplaats: 'Queens',
                betaler_geboorte_datum: new Date('1990-05-15'),
                betaler_nationaliteit_1: 'Amerikaanse',
                betaler_nationaliteit_2: null,
                betaler_telefoon: '0600000000',
                betaler_email: 'peter@example.com',
                betaler_beroep: 'Photographer',
                // Ontvanger fields
                ontvanger_voorletters: 'M.',
                ontvanger_voornamen: 'Mary',
                ontvanger_roepnaam: 'Mary',
                ontvanger_geslacht: 'V',
                ontvanger_tussenvoegsel: 'van',
                ontvanger_achternaam: 'Watson',
                ontvanger_adres: 'Baker St 221B',
                ontvanger_postcode: '2222BB',
                ontvanger_plaats: 'London',
                ontvanger_geboorteplaats: 'Oxford',
                ontvanger_geboorte_datum: new Date('1992-08-20'),
                ontvanger_nationaliteit_1: 'Britse',
                ontvanger_nationaliteit_2: null,
                ontvanger_telefoon: '0611111111',
                ontvanger_email: 'mary@example.com',
                ontvanger_beroep: 'Doctor'
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result).not.toBeNull();
            expect(result!.alimentatie.id).toBe(1);
            expect(result!.alimentatie.bedrag).toBe(750.50);
            expect(result!.alimentatie.frequentie).toBe('per week');
            expect(result!.betaler.voornamen).toBe('Peter');
            expect(result!.ontvanger.voornamen).toBe('Mary');
            expect(mockRequest.input).toHaveBeenCalledWith('alimentatieId', 1);
        });

        it('should return null when alimentatie not found', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.findById(999);

            expect(result).toBeNull();
            expect(mockRequest.input).toHaveBeenCalledWith('alimentatieId', 999);
        });
    });

    describe('create', () => {
        it('should create new alimentatie successfully', async () => {
            const newAlimentatie = {
                dossierId: 100,
                betalerId: 10,
                ontvangerId: 20,
                bedrag: 1000.00,
                frequentie: 'per maand',
                ingangsdatum: new Date('2024-01-01'),
                einddatum: new Date('2024-12-31'),
                opmerkingen: 'Monthly payment'
            };

            const insertedRecord = {
                id: 1,
                dossier_id: 100,
                betaler_id: 10,
                ontvanger_id: 20,
                bedrag: 1000.00,
                frequentie: 'per maand',
                ingangsdatum: new Date('2024-01-01'),
                einddatum: new Date('2024-12-31'),
                opmerkingen: 'Monthly payment',
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01')
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [insertedRecord] });

            const result = await repository.create(newAlimentatie);

            expect(result.id).toBe(1);
            expect(result.bedrag).toBe(1000.00);
            expect(result.frequentie).toBe('per maand');
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 100);
            expect(mockRequest.input).toHaveBeenCalledWith('betalerId', 10);
            expect(mockRequest.input).toHaveBeenCalledWith('ontvangerId', 20);
            expect(mockRequest.input).toHaveBeenCalledWith('bedrag', 1000.00);
        });

        it('should create alimentatie without optional fields', async () => {
            const newAlimentatie = {
                dossierId: 100,
                betalerId: 10,
                ontvangerId: 20,
                bedrag: 500.00,
                frequentie: 'eenmalig',
                ingangsdatum: new Date('2024-01-01')
            };

            const insertedRecord = {
                id: 1,
                dossier_id: 100,
                betaler_id: 10,
                ontvanger_id: 20,
                bedrag: 500.00,
                frequentie: 'eenmalig',
                ingangsdatum: new Date('2024-01-01'),
                einddatum: null,
                opmerkingen: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01')
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [insertedRecord] });

            const result = await repository.create(newAlimentatie);

            expect(result.id).toBe(1);
            expect(result.einddatum).toBeUndefined();
            expect(result.opmerkingen).toBeUndefined();
        });

        it('should throw error when create fails', async () => {
            const newAlimentatie = {
                dossierId: 100,
                betalerId: 10,
                ontvangerId: 20,
                bedrag: 1000.00,
                frequentie: 'per maand',
                ingangsdatum: new Date('2024-01-01')
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            await expect(repository.create(newAlimentatie))
                .rejects.toThrow('Failed to create alimentatie: No record returned');
        });
    });

    describe('update', () => {
        it('should update alimentatie successfully', async () => {
            const updateData = {
                bedrag: 1500.00,
                frequentie: 'per jaar',
                opmerkingen: 'Updated payment'
            };

            const updatedRecord = {
                id: 1,
                dossier_id: 100,
                betaler_id: 10,
                ontvanger_id: 20,
                bedrag: 1500.00,
                frequentie: 'per jaar',
                ingangsdatum: new Date('2024-01-01'),
                einddatum: null,
                opmerkingen: 'Updated payment',
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-02-01')
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [updatedRecord] });

            const result = await repository.update(1, updateData);

            expect(result.id).toBe(1);
            expect(result.bedrag).toBe(1500.00);
            expect(result.frequentie).toBe('per jaar');
            expect(result.opmerkingen).toBe('Updated payment');
            expect(mockRequest.input).toHaveBeenCalledWith('alimentatieId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('bedrag', 1500.00);
        });

        it('should update single field', async () => {
            const updateData = {
                bedrag: 2000.00
            };

            const updatedRecord = {
                id: 1,
                dossier_id: 100,
                betaler_id: 10,
                ontvanger_id: 20,
                bedrag: 2000.00,
                frequentie: 'per maand',
                ingangsdatum: new Date('2024-01-01'),
                einddatum: null,
                opmerkingen: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-02-01')
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [updatedRecord] });

            const result = await repository.update(1, updateData);

            expect(result.bedrag).toBe(2000.00);
        });

        it('should throw error when no fields to update', async () => {
            await expect(repository.update(1, {}))
                .rejects.toThrow('No fields to update');
        });

        it('should throw error when update fails', async () => {
            const updateData = {
                bedrag: 1500.00
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            await expect(repository.update(999, updateData))
                .rejects.toThrow('Alimentatie not found or update failed');
        });
    });

    describe('delete', () => {
        it('should delete alimentatie successfully', async () => {
            mockRequest.query.mockResolvedValueOnce({ rowsAffected: [1] });

            const result = await repository.delete(1);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('alimentatieId', 1);
        });

        it('should return false when alimentatie not found', async () => {
            mockRequest.query.mockResolvedValueOnce({ rowsAffected: [0] });

            const result = await repository.delete(999);

            expect(result).toBe(false);
        });
    });

    describe('alimentatieExists', () => {
        it('should return true when alimentatie exists', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [{ count: 1 }] });

            const result = await repository.alimentatieExists(1);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('alimentatieId', 1);
        });

        it('should return false when alimentatie does not exist', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [{ count: 0 }] });

            const result = await repository.alimentatieExists(999);

            expect(result).toBe(false);
        });

        it('should return false when query returns no results', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.alimentatieExists(999);

            expect(result).toBe(false);
        });
    });

    describe('count', () => {
        it('should return count of alimentatie in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [{ total: 5 }] });

            const result = await repository.count(100);

            expect(result).toBe(5);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 100);
        });

        it('should return 0 when no alimentatie in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [{ total: 0 }] });

            const result = await repository.count(100);

            expect(result).toBe(0);
        });

        it('should return 0 when query returns no results', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.count(100);

            expect(result).toBe(0);
        });
    });

    describe('validateBetaler', () => {
        it('should return true when betaler is partij in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [{ count: 1 }] });

            const result = await repository.validateBetaler(100, 10);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 100);
            expect(mockRequest.input).toHaveBeenCalledWith('betalerId', 10);
        });

        it('should return false when betaler is not partij in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [{ count: 0 }] });

            const result = await repository.validateBetaler(100, 999);

            expect(result).toBe(false);
        });

        it('should return false when query returns no results', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.validateBetaler(100, 999);

            expect(result).toBe(false);
        });
    });

    describe('validateOntvanger', () => {
        it('should return true when ontvanger is partij in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [{ count: 1 }] });

            const result = await repository.validateOntvanger(100, 20);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 100);
            expect(mockRequest.input).toHaveBeenCalledWith('ontvangerId', 20);
        });

        it('should return false when ontvanger is not partij in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [{ count: 0 }] });

            const result = await repository.validateOntvanger(100, 999);

            expect(result).toBe(false);
        });

        it('should return false when query returns no results', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.validateOntvanger(100, 999);

            expect(result).toBe(false);
        });
    });

    describe('Data mapping', () => {
        it('should correctly map bedrag as number', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                betaler_id: 10,
                ontvanger_id: 20,
                bedrag: '1234.56', // String from database
                frequentie: 'per maand',
                ingangsdatum: new Date('2024-01-01'),
                einddatum: null,
                opmerkingen: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01'),
                betaler_voorletters: 'J.',
                betaler_voornamen: 'John',
                betaler_roepnaam: null,
                betaler_geslacht: null,
                betaler_tussenvoegsel: null,
                betaler_achternaam: 'Doe',
                betaler_adres: null,
                betaler_postcode: null,
                betaler_plaats: null,
                betaler_geboorteplaats: null,
                betaler_geboorte_datum: null,
                betaler_nationaliteit_1: null,
                betaler_nationaliteit_2: null,
                betaler_telefoon: null,
                betaler_email: null,
                betaler_beroep: null,
                ontvanger_voorletters: 'J.',
                ontvanger_voornamen: 'Jane',
                ontvanger_roepnaam: null,
                ontvanger_geslacht: null,
                ontvanger_tussenvoegsel: null,
                ontvanger_achternaam: 'Smith',
                ontvanger_adres: null,
                ontvanger_postcode: null,
                ontvanger_plaats: null,
                ontvanger_geboorteplaats: null,
                ontvanger_geboorte_datum: null,
                ontvanger_nationaliteit_1: null,
                ontvanger_nationaliteit_2: null,
                ontvanger_telefoon: null,
                ontvanger_email: null,
                ontvanger_beroep: null
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result!.alimentatie.bedrag).toBe(1234.56);
            expect(typeof result!.alimentatie.bedrag).toBe('number');
        });

        it('should handle null einddatum correctly', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                betaler_id: 10,
                ontvanger_id: 20,
                bedrag: 500.00,
                frequentie: 'per maand',
                ingangsdatum: new Date('2024-01-01'),
                einddatum: null,
                opmerkingen: 'Test',
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01'),
                betaler_achternaam: 'Doe',
                ontvanger_achternaam: 'Smith'
            };

            mockRequest.query.mockResolvedValueOnce({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result!.alimentatie.einddatum).toBeUndefined();
        });
    });
});
