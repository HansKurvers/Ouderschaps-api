import { OmgangRepository } from '../../repositories/OmgangRepository';
import { CreateOmgangDto, UpdateOmgangDto } from '../../models/Dossier';

// Mock the database module
jest.mock('../../config/database');

describe('OmgangRepository', () => {
    let repository: OmgangRepository;
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

        repository = new OmgangRepository();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findByDossierId', () => {
        it('should find all omgang by dossier ID with all lookups', async () => {
            const mockRecords = [
                {
                    id: 1,
                    dossier_id: 100,
                    dag_id: 1,
                    dagdeel_id: 1,
                    verzorger_id: 10,
                    wissel_tijd: '08:00',
                    week_regeling_id: 1,
                    week_regeling_anders: null,
                    aangemaakt_op: new Date('2024-01-01'),
                    gewijzigd_op: new Date('2024-01-01'),
                    // Dag fields
                    dag_naam: 'Maandag',
                    // Dagdeel fields
                    dagdeel_naam: 'Ochtend',
                    // Verzorger fields
                    verzorger_voorletters: 'J.',
                    verzorger_voornamen: 'Jan',
                    verzorger_roepnaam: 'Jan',
                    verzorger_geslacht: 'Man',
                    verzorger_tussenvoegsel: null,
                    verzorger_achternaam: 'Jansen',
                    verzorger_adres: 'Teststraat 1',
                    verzorger_postcode: '1234AB',
                    verzorger_plaats: 'Amsterdam',
                    verzorger_geboorteplaats: 'Amsterdam',
                    verzorger_geboorte_datum: new Date('1980-01-01'),
                    verzorger_nationaliteit_1: 'Nederlandse',
                    verzorger_nationaliteit_2: null,
                    verzorger_telefoon: '0612345678',
                    verzorger_email: 'jan@test.nl',
                    verzorger_beroep: 'Leraar',
                    verzorger_rol_id: 1,
                    // Week regeling fields
                    week_regeling_omschrijving: 'Elke week'
                },
                {
                    id: 2,
                    dossier_id: 100,
                    dag_id: 1,
                    dagdeel_id: 2,
                    verzorger_id: 11,
                    wissel_tijd: '13:00',
                    week_regeling_id: 1,
                    week_regeling_anders: null,
                    aangemaakt_op: new Date('2024-01-01'),
                    gewijzigd_op: new Date('2024-01-01'),
                    dag_naam: 'Maandag',
                    dagdeel_naam: 'Middag',
                    verzorger_voorletters: 'M.',
                    verzorger_voornamen: 'Marie',
                    verzorger_roepnaam: 'Marie',
                    verzorger_geslacht: 'Vrouw',
                    verzorger_tussenvoegsel: null,
                    verzorger_achternaam: 'Bakker',
                    verzorger_adres: 'Testlaan 2',
                    verzorger_postcode: '1234CD',
                    verzorger_plaats: 'Amsterdam',
                    verzorger_geboorteplaats: 'Rotterdam',
                    verzorger_geboorte_datum: new Date('1982-01-01'),
                    verzorger_nationaliteit_1: 'Nederlandse',
                    verzorger_nationaliteit_2: null,
                    verzorger_telefoon: '0698765432',
                    verzorger_email: 'marie@test.nl',
                    verzorger_beroep: 'Arts',
                    verzorger_rol_id: 2,
                    week_regeling_omschrijving: 'Elke week'
                }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            const result = await repository.findByDossierId(100);

            expect(result).toHaveLength(2);
            expect(result[0].omgang.id).toBe(1);
            expect(result[0].dag.naam).toBe('Maandag');
            expect(result[0].dagdeel.naam).toBe('Ochtend');
            expect(result[0].verzorger.voornamen).toBe('Jan');
            expect(result[0].weekRegeling.omschrijving).toBe('Elke week');
            expect(result[1].omgang.id).toBe(2);
            expect(result[1].verzorger.voornamen).toBe('Marie');
        });

        it('should return empty array when no omgang found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.findByDossierId(999);

            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('should find omgang by ID with all lookups', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                dag_id: 1,
                dagdeel_id: 1,
                verzorger_id: 10,
                wissel_tijd: '08:00',
                week_regeling_id: 1,
                week_regeling_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01'),
                dag_naam: 'Maandag',
                dagdeel_naam: 'Ochtend',
                verzorger_voorletters: 'J.',
                verzorger_voornamen: 'Jan',
                verzorger_roepnaam: 'Jan',
                verzorger_geslacht: 'Man',
                verzorger_tussenvoegsel: null,
                verzorger_achternaam: 'Jansen',
                verzorger_adres: 'Teststraat 1',
                verzorger_postcode: '1234AB',
                verzorger_plaats: 'Amsterdam',
                verzorger_geboorteplaats: 'Amsterdam',
                verzorger_geboorte_datum: new Date('1980-01-01'),
                verzorger_nationaliteit_1: 'Nederlandse',
                verzorger_nationaliteit_2: null,
                verzorger_telefoon: '0612345678',
                verzorger_email: 'jan@test.nl',
                verzorger_beroep: 'Leraar',
                verzorger_rol_id: 1,
                week_regeling_omschrijving: 'Elke week'
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result).not.toBeNull();
            expect(result?.omgang.id).toBe(1);
            expect(result?.omgang.wisselTijd).toBe('08:00');
            expect(result?.dag.naam).toBe('Maandag');
            expect(result?.dagdeel.naam).toBe('Ochtend');
            expect(result?.verzorger.achternaam).toBe('Jansen');
            expect(result?.weekRegeling.omschrijving).toBe('Elke week');
        });

        it('should return null when omgang not found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.findById(999);

            expect(result).toBeNull();
        });
    });

    describe('getSchedule', () => {
        it('should get structured schedule for dossier', async () => {
            const mockRecords = [
                {
                    id: 1,
                    dossier_id: 100,
                    dag_id: 1,
                    dagdeel_id: 1,
                    verzorger_id: 10,
                    wissel_tijd: '08:00',
                    week_regeling_id: 1,
                    week_regeling_anders: null,
                    aangemaakt_op: new Date('2024-01-01'),
                    gewijzigd_op: new Date('2024-01-01'),
                    dag_naam: 'Maandag',
                    dagdeel_naam: 'Ochtend',
                    verzorger_voorletters: 'J.',
                    verzorger_voornamen: 'Jan',
                    verzorger_roepnaam: 'Jan',
                    verzorger_geslacht: 'Man',
                    verzorger_tussenvoegsel: null,
                    verzorger_achternaam: 'Jansen',
                    verzorger_adres: null,
                    verzorger_postcode: null,
                    verzorger_plaats: null,
                    verzorger_geboorteplaats: null,
                    verzorger_geboorte_datum: null,
                    verzorger_nationaliteit_1: null,
                    verzorger_nationaliteit_2: null,
                    verzorger_telefoon: null,
                    verzorger_email: null,
                    verzorger_beroep: null,
                    verzorger_rol_id: 1,
                    week_regeling_omschrijving: 'Elke week'
                },
                {
                    id: 2,
                    dossier_id: 100,
                    dag_id: 2,
                    dagdeel_id: 1,
                    verzorger_id: 11,
                    wissel_tijd: '08:30',
                    week_regeling_id: 1,
                    week_regeling_anders: null,
                    aangemaakt_op: new Date('2024-01-01'),
                    gewijzigd_op: new Date('2024-01-01'),
                    dag_naam: 'Dinsdag',
                    dagdeel_naam: 'Ochtend',
                    verzorger_voorletters: 'M.',
                    verzorger_voornamen: 'Marie',
                    verzorger_roepnaam: 'Marie',
                    verzorger_geslacht: 'Vrouw',
                    verzorger_tussenvoegsel: null,
                    verzorger_achternaam: 'Bakker',
                    verzorger_adres: null,
                    verzorger_postcode: null,
                    verzorger_plaats: null,
                    verzorger_geboorteplaats: null,
                    verzorger_geboorte_datum: null,
                    verzorger_nationaliteit_1: null,
                    verzorger_nationaliteit_2: null,
                    verzorger_telefoon: null,
                    verzorger_email: null,
                    verzorger_beroep: null,
                    verzorger_rol_id: 2,
                    week_regeling_omschrijving: 'Elke week'
                }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            const result = await repository.getSchedule(100);

            expect(result['Maandag']).toBeDefined();
            expect(result['Maandag']['Ochtend']).toBeDefined();
            expect(result['Maandag']['Ochtend'].wisselTijd).toBe('08:00');
            expect(result['Maandag']['Ochtend'].verzorger.voornamen).toBe('Jan');
            expect(result['Dinsdag']).toBeDefined();
            expect(result['Dinsdag']['Ochtend']).toBeDefined();
            expect(result['Dinsdag']['Ochtend'].verzorger.voornamen).toBe('Marie');
        });

        it('should handle empty schedule', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.getSchedule(100);

            expect(result).toEqual({});
        });

        it('should structure multiple entries per dossier', async () => {
            const mockRecords = [
                {
                    id: 1,
                    dossier_id: 100,
                    dag_id: 1,
                    dagdeel_id: 1,
                    verzorger_id: 10,
                    wissel_tijd: '08:00',
                    week_regeling_id: 1,
                    week_regeling_anders: null,
                    aangemaakt_op: new Date('2024-01-01'),
                    gewijzigd_op: new Date('2024-01-01'),
                    dag_naam: 'Maandag',
                    dagdeel_naam: 'Ochtend',
                    verzorger_voorletters: 'J.',
                    verzorger_voornamen: 'Jan',
                    verzorger_roepnaam: null,
                    verzorger_geslacht: null,
                    verzorger_tussenvoegsel: null,
                    verzorger_achternaam: 'Jansen',
                    verzorger_adres: null,
                    verzorger_postcode: null,
                    verzorger_plaats: null,
                    verzorger_geboorteplaats: null,
                    verzorger_geboorte_datum: null,
                    verzorger_nationaliteit_1: null,
                    verzorger_nationaliteit_2: null,
                    verzorger_telefoon: null,
                    verzorger_email: null,
                    verzorger_beroep: null,
                    verzorger_rol_id: 1,
                    week_regeling_omschrijving: 'Elke week'
                },
                {
                    id: 2,
                    dossier_id: 100,
                    dag_id: 1,
                    dagdeel_id: 2,
                    verzorger_id: 11,
                    wissel_tijd: '13:00',
                    week_regeling_id: 1,
                    week_regeling_anders: null,
                    aangemaakt_op: new Date('2024-01-01'),
                    gewijzigd_op: new Date('2024-01-01'),
                    dag_naam: 'Maandag',
                    dagdeel_naam: 'Middag',
                    verzorger_voorletters: 'M.',
                    verzorger_voornamen: 'Marie',
                    verzorger_roepnaam: null,
                    verzorger_geslacht: null,
                    verzorger_tussenvoegsel: null,
                    verzorger_achternaam: 'Bakker',
                    verzorger_adres: null,
                    verzorger_postcode: null,
                    verzorger_plaats: null,
                    verzorger_geboorteplaats: null,
                    verzorger_geboorte_datum: null,
                    verzorger_nationaliteit_1: null,
                    verzorger_nationaliteit_2: null,
                    verzorger_telefoon: null,
                    verzorger_email: null,
                    verzorger_beroep: null,
                    verzorger_rol_id: 2,
                    week_regeling_omschrijving: 'Elke week'
                }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRecords });

            const result = await repository.getSchedule(100);

            expect(result['Maandag']['Ochtend']).toBeDefined();
            expect(result['Maandag']['Middag']).toBeDefined();
            expect(result['Maandag']['Ochtend'].verzorger.voornamen).toBe('Jan');
            expect(result['Maandag']['Middag'].verzorger.voornamen).toBe('Marie');
        });
    });

    describe('create', () => {
        it('should create new omgang successfully', async () => {
            const createDto: CreateOmgangDto = {
                dossierId: 100,
                dagId: 1,
                dagdeelId: 1,
                verzorgerId: 10,
                wisselTijd: '08:00',
                weekRegelingId: 1,
                weekRegelingAnders: undefined
            };

            const mockInserted = {
                id: 1,
                dossier_id: 100,
                dag_id: 1,
                dagdeel_id: 1,
                verzorger_id: 10,
                wissel_tijd: '08:00',
                week_regeling_id: 1,
                week_regeling_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01')
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockInserted] });

            const result = await repository.create(createDto);

            expect(result.id).toBe(1);
            expect(result.dossierId).toBe(100);
            expect(result.dagId).toBe(1);
            expect(result.dagdeelId).toBe(1);
            expect(result.verzorgerId).toBe(10);
            expect(result.wisselTijd).toBe('08:00');
        });

        it('should create omgang without optional fields', async () => {
            const createDto: CreateOmgangDto = {
                dossierId: 100,
                dagId: 1,
                dagdeelId: 1,
                verzorgerId: 10,
                weekRegelingId: 1
            };

            const mockInserted = {
                id: 1,
                dossier_id: 100,
                dag_id: 1,
                dagdeel_id: 1,
                verzorger_id: 10,
                wissel_tijd: null,
                week_regeling_id: 1,
                week_regeling_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01')
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockInserted] });

            const result = await repository.create(createDto);

            expect(result.wisselTijd).toBeUndefined();
            expect(result.weekRegelingAnders).toBeUndefined();
        });

        it('should throw error if create fails', async () => {
            const createDto: CreateOmgangDto = {
                dossierId: 100,
                dagId: 1,
                dagdeelId: 1,
                verzorgerId: 10,
                weekRegelingId: 1
            };

            mockRequest.query.mockResolvedValue({ recordset: [] });

            await expect(repository.create(createDto)).rejects.toThrow('Failed to create omgang record');
        });
    });

    describe('update', () => {
        it('should update omgang successfully', async () => {
            const updateDto: UpdateOmgangDto = {
                wisselTijd: '09:00'
            };

            const mockUpdated = {
                id: 1,
                dossier_id: 100,
                dag_id: 1,
                dagdeel_id: 1,
                verzorger_id: 10,
                wissel_tijd: '09:00',
                week_regeling_id: 1,
                week_regeling_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-20')
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockUpdated] });

            const result = await repository.update(1, updateDto);

            expect(result.wisselTijd).toBe('09:00');
        });

        it('should update multiple fields', async () => {
            const updateDto: UpdateOmgangDto = {
                dagId: 2,
                dagdeelId: 2,
                verzorgerId: 11,
                wisselTijd: '14:00'
            };

            const mockUpdated = {
                id: 1,
                dossier_id: 100,
                dag_id: 2,
                dagdeel_id: 2,
                verzorger_id: 11,
                wissel_tijd: '14:00',
                week_regeling_id: 1,
                week_regeling_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-20')
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockUpdated] });

            const result = await repository.update(1, updateDto);

            expect(result.dagId).toBe(2);
            expect(result.dagdeelId).toBe(2);
            expect(result.verzorgerId).toBe(11);
            expect(result.wisselTijd).toBe('14:00');
        });

        it('should throw error when no fields to update', async () => {
            const updateDto: UpdateOmgangDto = {};

            await expect(repository.update(1, updateDto)).rejects.toThrow('No fields provided for update');
        });

        it('should throw error when omgang not found', async () => {
            const updateDto: UpdateOmgangDto = {
                wisselTijd: '09:00'
            };

            mockRequest.query.mockResolvedValue({ recordset: [] });

            await expect(repository.update(999, updateDto)).rejects.toThrow('Omgang with ID 999 not found');
        });
    });

    describe('delete', () => {
        it('should delete omgang successfully', async () => {
            mockRequest.query.mockResolvedValue({ rowsAffected: [1] });

            const result = await repository.delete(1);

            expect(result).toBe(true);
        });

        it('should return false when omgang not found', async () => {
            mockRequest.query.mockResolvedValue({ rowsAffected: [0] });

            const result = await repository.delete(999);

            expect(result).toBe(false);
        });
    });

    describe('omgangExists', () => {
        it('should return true when omgang exists', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            const result = await repository.omgangExists(1);

            expect(result).toBe(true);
        });

        it('should return false when omgang does not exist', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            const result = await repository.omgangExists(999);

            expect(result).toBe(false);
        });

        it('should return false when no results', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.omgangExists(999);

            expect(result).toBe(false);
        });
    });

    describe('count', () => {
        it('should count omgang in dossier', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 5 }] });

            const result = await repository.count(100);

            expect(result).toBe(5);
        });

        it('should return 0 when no omgang found', async () => {
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

    describe('validateVerzorger', () => {
        it('should return true when verzorger is partij in dossier', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            const result = await repository.validateVerzorger(100, 10);

            expect(result).toBe(true);
        });

        it('should return false when verzorger is not partij in dossier', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            const result = await repository.validateVerzorger(100, 99);

            expect(result).toBe(false);
        });

        it('should return false when no results', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.validateVerzorger(100, 99);

            expect(result).toBe(false);
        });
    });

    describe('checkOverlap', () => {
        it('should detect overlap when same dag+dagdeel+week_regeling exists', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 1 }] });

            const result = await repository.checkOverlap(100, 1, 1, 1);

            expect(result).toBe(true);
        });

        it('should not detect overlap for different dag', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            const result = await repository.checkOverlap(100, 2, 1, 1);

            expect(result).toBe(false);
        });

        it('should not detect overlap for different dagdeel', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            const result = await repository.checkOverlap(100, 1, 2, 1);

            expect(result).toBe(false);
        });

        it('should exclude self when checking overlap on update', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [{ count: 0 }] });

            const result = await repository.checkOverlap(100, 1, 1, 1, 1);

            expect(result).toBe(false);
        });

        it('should return false when no results', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.checkOverlap(100, 1, 1, 1);

            expect(result).toBe(false);
        });
    });

    describe('getAllDagen', () => {
        it('should get all dagen (7 days)', async () => {
            const mockDagen = [
                { id: 1, naam: 'Maandag' },
                { id: 2, naam: 'Dinsdag' },
                { id: 3, naam: 'Woensdag' },
                { id: 4, naam: 'Donderdag' },
                { id: 5, naam: 'Vrijdag' },
                { id: 6, naam: 'Zaterdag' },
                { id: 7, naam: 'Zondag' }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockDagen });

            const result = await repository.getAllDagen();

            expect(result).toHaveLength(7);
            expect(result[0].naam).toBe('Maandag');
            expect(result[6].naam).toBe('Zondag');
        });

        it('should return empty array when no dagen found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.getAllDagen();

            expect(result).toEqual([]);
        });
    });

    describe('getAllDagdelen', () => {
        it('should get all dagdelen (4 parts)', async () => {
            const mockDagdelen = [
                { id: 1, naam: 'Ochtend' },
                { id: 2, naam: 'Middag' },
                { id: 3, naam: 'Avond' },
                { id: 4, naam: 'Nacht' }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockDagdelen });

            const result = await repository.getAllDagdelen();

            expect(result).toHaveLength(4);
            expect(result[0].naam).toBe('Ochtend');
            expect(result[3].naam).toBe('Nacht');
        });

        it('should return empty array when no dagdelen found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.getAllDagdelen();

            expect(result).toEqual([]);
        });
    });

    describe('getAllWeekRegelingen', () => {
        it('should get all week regelingen', async () => {
            const mockRegelingen = [
                { id: 1, omschrijving: 'Elke week' },
                { id: 2, omschrijving: 'Even weken' },
                { id: 3, omschrijving: 'Oneven weken' }
            ];

            mockRequest.query.mockResolvedValue({ recordset: mockRegelingen });

            const result = await repository.getAllWeekRegelingen();

            expect(result).toHaveLength(3);
            expect(result[0].omschrijving).toBe('Elke week');
            expect(result[1].omschrijving).toBe('Even weken');
        });

        it('should return empty array when no week regelingen found', async () => {
            mockRequest.query.mockResolvedValue({ recordset: [] });

            const result = await repository.getAllWeekRegelingen();

            expect(result).toEqual([]);
        });
    });

    describe('Data Mapping', () => {
        it('should handle optional wissel_tijd', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                dag_id: 1,
                dagdeel_id: 1,
                verzorger_id: 10,
                wissel_tijd: null,
                week_regeling_id: 1,
                week_regeling_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01'),
                dag_naam: 'Maandag',
                dagdeel_naam: 'Ochtend',
                verzorger_voorletters: 'J.',
                verzorger_voornamen: 'Jan',
                verzorger_roepnaam: null,
                verzorger_geslacht: null,
                verzorger_tussenvoegsel: null,
                verzorger_achternaam: 'Jansen',
                verzorger_adres: null,
                verzorger_postcode: null,
                verzorger_plaats: null,
                verzorger_geboorteplaats: null,
                verzorger_geboorte_datum: null,
                verzorger_nationaliteit_1: null,
                verzorger_nationaliteit_2: null,
                verzorger_telefoon: null,
                verzorger_email: null,
                verzorger_beroep: null,
                verzorger_rol_id: 1,
                week_regeling_omschrijving: 'Elke week'
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result?.omgang.wisselTijd).toBeUndefined();
        });

        it('should handle optional week_regeling_anders', async () => {
            const mockRecord = {
                id: 1,
                dossier_id: 100,
                dag_id: 1,
                dagdeel_id: 1,
                verzorger_id: 10,
                wissel_tijd: '08:00',
                week_regeling_id: 1,
                week_regeling_anders: null,
                aangemaakt_op: new Date('2024-01-01'),
                gewijzigd_op: new Date('2024-01-01'),
                dag_naam: 'Maandag',
                dagdeel_naam: 'Ochtend',
                verzorger_voorletters: 'J.',
                verzorger_voornamen: 'Jan',
                verzorger_roepnaam: null,
                verzorger_geslacht: null,
                verzorger_tussenvoegsel: null,
                verzorger_achternaam: 'Jansen',
                verzorger_adres: null,
                verzorger_postcode: null,
                verzorger_plaats: null,
                verzorger_geboorteplaats: null,
                verzorger_geboorte_datum: null,
                verzorger_nationaliteit_1: null,
                verzorger_nationaliteit_2: null,
                verzorger_telefoon: null,
                verzorger_email: null,
                verzorger_beroep: null,
                verzorger_rol_id: 1,
                week_regeling_omschrijving: 'Elke week'
            };

            mockRequest.query.mockResolvedValue({ recordset: [mockRecord] });

            const result = await repository.findById(1);

            expect(result?.omgang.weekRegelingAnders).toBeUndefined();
        });
    });
});
