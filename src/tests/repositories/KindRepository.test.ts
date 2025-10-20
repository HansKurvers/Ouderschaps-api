import { KindRepository } from '../../repositories/KindRepository';
import * as database from '../../config/database';

// Mock the database module
jest.mock('../../config/database');

describe('KindRepository', () => {
    let repository: KindRepository;
    let mockPool: any;
    let mockRequest: any;

    beforeEach(() => {
        repository = new KindRepository();

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
        it('should return empty array when no kinderen exist for dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.findByDossierId(1);

            expect(result).toEqual([]);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
            expect(mockRequest.query).toHaveBeenCalledTimes(1);
        });

        it('should return kinderen with ouders for a dossier', async () => {
            // First query returns kinderen
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        dossier_kind_id: 100,
                        id: 1,
                        voorletters: 'J.',
                        voornamen: 'Jan',
                        roepnaam: 'Jan',
                        geslacht: 'M',
                        tussenvoegsel: 'de',
                        achternaam: 'Jong',
                        adres: 'Teststraat 1',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Utrecht',
                        geboorte_datum: new Date('2015-03-15'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: null,
                        email: null,
                        beroep: null
                    }
                ]
            });

            // Second query returns ouders for kind
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        kinderen_ouders_id: 200,
                        id: 2,
                        voorletters: 'P.',
                        voornamen: 'Piet',
                        roepnaam: 'Piet',
                        geslacht: 'M',
                        tussenvoegsel: 'de',
                        achternaam: 'Jong',
                        adres: 'Ouderstraat 10',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Rotterdam',
                        geboorte_datum: new Date('1985-05-20'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: '0612345678',
                        email: 'piet@example.com',
                        beroep: 'Software Engineer',
                        relatie_type_id: 1,
                        relatie_type_naam: 'Biologische vader'
                    }
                ]
            });

            const result = await repository.findByDossierId(1);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(100);
            expect(result[0].kind.id).toBe(1);
            expect(result[0].kind.voornamen).toBe('Jan');
            expect(result[0].ouders).toHaveLength(1);
            expect(result[0].ouders[0].ouder.voornamen).toBe('Piet');
            expect(result[0].ouders[0].relatieType.naam).toBe('Biologische vader');
        });

        it('should return kind with multiple ouders', async () => {
            // First query returns one kind
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        dossier_kind_id: 100,
                        id: 1,
                        voorletters: 'J.',
                        voornamen: 'Jan',
                        roepnaam: 'Jan',
                        geslacht: 'M',
                        tussenvoegsel: 'de',
                        achternaam: 'Jong',
                        adres: 'Teststraat 1',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Utrecht',
                        geboorte_datum: new Date('2015-03-15'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: null,
                        email: null,
                        beroep: null
                    }
                ]
            });

            // Second query returns two ouders
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        kinderen_ouders_id: 200,
                        id: 2,
                        voorletters: 'P.',
                        voornamen: 'Piet',
                        roepnaam: 'Piet',
                        geslacht: 'M',
                        tussenvoegsel: 'de',
                        achternaam: 'Jong',
                        adres: 'Ouderstraat 10',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Rotterdam',
                        geboorte_datum: new Date('1985-05-20'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: '0612345678',
                        email: 'piet@example.com',
                        beroep: 'Software Engineer',
                        relatie_type_id: 1,
                        relatie_type_naam: 'Biologische vader'
                    },
                    {
                        kinderen_ouders_id: 201,
                        id: 3,
                        voorletters: 'M.',
                        voornamen: 'Marie',
                        roepnaam: 'Marie',
                        geslacht: 'V',
                        tussenvoegsel: null,
                        achternaam: 'Bakker',
                        adres: 'Ouderstraat 10',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Den Haag',
                        geboorte_datum: new Date('1987-08-12'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: '0687654321',
                        email: 'marie@example.com',
                        beroep: 'Teacher',
                        relatie_type_id: 2,
                        relatie_type_naam: 'Biologische moeder'
                    }
                ]
            });

            const result = await repository.findByDossierId(1);

            expect(result).toHaveLength(1);
            expect(result[0].ouders).toHaveLength(2);
            expect(result[0].ouders[0].relatieType.naam).toBe('Biologische vader');
            expect(result[0].ouders[1].relatieType.naam).toBe('Biologische moeder');
        });

        it('should return kind with no ouders', async () => {
            // First query returns one kind
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        dossier_kind_id: 100,
                        id: 1,
                        voorletters: 'J.',
                        voornamen: 'Jan',
                        roepnaam: 'Jan',
                        geslacht: 'M',
                        tussenvoegsel: 'de',
                        achternaam: 'Jong',
                        adres: 'Teststraat 1',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Utrecht',
                        geboorte_datum: new Date('2015-03-15'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: null,
                        email: null,
                        beroep: null
                    }
                ]
            });

            // Second query returns no ouders
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.findByDossierId(1);

            expect(result).toHaveLength(1);
            expect(result[0].ouders).toHaveLength(0);
        });
    });

    describe('findById', () => {
        it('should return null when kind not found', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.findById(1, 100);

            expect(result).toBeNull();
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierKindId', 100);
        });

        it('should return kind with ouders by id', async () => {
            // First query returns the kind
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        dossier_kind_id: 100,
                        id: 1,
                        voorletters: 'J.',
                        voornamen: 'Jan',
                        roepnaam: 'Jan',
                        geslacht: 'M',
                        tussenvoegsel: 'de',
                        achternaam: 'Jong',
                        adres: 'Teststraat 1',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Utrecht',
                        geboorte_datum: new Date('2015-03-15'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: null,
                        email: null,
                        beroep: null
                    }
                ]
            });

            // Second query returns ouders
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        kinderen_ouders_id: 200,
                        id: 2,
                        voorletters: 'P.',
                        voornamen: 'Piet',
                        roepnaam: 'Piet',
                        geslacht: 'M',
                        tussenvoegsel: 'de',
                        achternaam: 'Jong',
                        adres: 'Ouderstraat 10',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Rotterdam',
                        geboorte_datum: new Date('1985-05-20'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: '0612345678',
                        email: 'piet@example.com',
                        beroep: 'Software Engineer',
                        relatie_type_id: 1,
                        relatie_type_naam: 'Biologische vader'
                    }
                ]
            });

            const result = await repository.findById(1, 100);

            expect(result).not.toBeNull();
            expect(result!.id).toBe(100);
            expect(result!.kind.id).toBe(1);
            expect(result!.kind.voornamen).toBe('Jan');
            expect(result!.ouders).toHaveLength(1);
        });
    });

    describe('addToDossier', () => {
        it('should add kind to dossier and return dossier_kind_id', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [{ id: 100 }]
            });

            const result = await repository.addToDossier(1, 5);

            expect(result).toBe(100);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('kindId', 5);
        });

        it('should throw error when no ID returned', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: []
            });

            await expect(repository.addToDossier(1, 5))
                .rejects.toThrow('Failed to add kind to dossier: No ID returned');
        });
    });

    describe('removeFromDossier', () => {
        it('should return true when kind removed successfully', async () => {
            mockRequest.query.mockResolvedValueOnce({
                rowsAffected: [1]
            });

            const result = await repository.removeFromDossier(1, 100);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierKindId', 100);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
        });

        it('should return false when kind not found', async () => {
            mockRequest.query.mockResolvedValueOnce({
                rowsAffected: [0]
            });

            const result = await repository.removeFromDossier(1, 999);

            expect(result).toBe(false);
        });
    });

    describe('linkOuderToKind', () => {
        it('should link ouder to kind and return kinderen_ouders_id', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [{ id: 200 }]
            });

            const result = await repository.linkOuderToKind(1, 2, 1);

            expect(result).toBe(200);
            expect(mockRequest.input).toHaveBeenCalledWith('kindId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('ouderId', 2);
            expect(mockRequest.input).toHaveBeenCalledWith('relatieTypeId', 1);
        });

        it('should throw error when no ID returned', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: []
            });

            await expect(repository.linkOuderToKind(1, 2, 1))
                .rejects.toThrow('Failed to link ouder to kind: No ID returned');
        });
    });

    describe('unlinkOuderFromKind', () => {
        it('should return true when ouder unlinked successfully', async () => {
            mockRequest.query.mockResolvedValueOnce({
                rowsAffected: [1]
            });

            const result = await repository.unlinkOuderFromKind(1, 2);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('kindId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('ouderId', 2);
        });

        it('should return false when relationship not found', async () => {
            mockRequest.query.mockResolvedValueOnce({
                rowsAffected: [0]
            });

            const result = await repository.unlinkOuderFromKind(1, 999);

            expect(result).toBe(false);
        });
    });

    describe('updateOuderRelatie', () => {
        it('should update relatie_type successfully', async () => {
            mockRequest.query.mockResolvedValueOnce({
                rowsAffected: [1]
            });

            const result = await repository.updateOuderRelatie(1, 2, 3);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('kindId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('ouderId', 2);
            expect(mockRequest.input).toHaveBeenCalledWith('relatieTypeId', 3);
        });

        it('should return false when relationship not found', async () => {
            mockRequest.query.mockResolvedValueOnce({
                rowsAffected: [0]
            });

            const result = await repository.updateOuderRelatie(1, 999, 3);

            expect(result).toBe(false);
        });
    });

    describe('getOudersForKind', () => {
        it('should return empty array when no ouders found', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.getOudersForKind(1);

            expect(result).toEqual([]);
            expect(mockRequest.input).toHaveBeenCalledWith('kindId', 1);
        });

        it('should return ouders with correct data mapping', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        kinderen_ouders_id: 200,
                        id: 2,
                        voorletters: 'P.',
                        voornamen: 'Piet',
                        roepnaam: 'Piet',
                        geslacht: 'M',
                        tussenvoegsel: 'de',
                        achternaam: 'Jong',
                        adres: 'Ouderstraat 10',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Rotterdam',
                        geboorte_datum: new Date('1985-05-20'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: '0612345678',
                        email: 'piet@example.com',
                        beroep: 'Software Engineer',
                        relatie_type_id: 1,
                        relatie_type_naam: 'Biologische vader'
                    },
                    {
                        kinderen_ouders_id: 201,
                        id: 3,
                        voorletters: 'M.',
                        voornamen: 'Marie',
                        roepnaam: 'Marie',
                        geslacht: 'V',
                        tussenvoegsel: null,
                        achternaam: 'Bakker',
                        adres: 'Ouderstraat 10',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Den Haag',
                        geboorte_datum: new Date('1987-08-12'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: '0687654321',
                        email: 'marie@example.com',
                        beroep: 'Teacher',
                        relatie_type_id: 2,
                        relatie_type_naam: 'Biologische moeder'
                    }
                ]
            });

            const result = await repository.getOudersForKind(1);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(200);
            expect(result[0].ouder.voornamen).toBe('Piet');
            expect(result[0].relatieType.id).toBe(1);
            expect(result[0].relatieType.naam).toBe('Biologische vader');
            expect(result[1].id).toBe(201);
            expect(result[1].ouder.voornamen).toBe('Marie');
            expect(result[1].relatieType.id).toBe(2);
        });
    });

    describe('isKindInDossier', () => {
        it('should return true when kind is in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [{ count: 1 }]
            });

            const result = await repository.isKindInDossier(1, 5);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('kindId', 5);
        });

        it('should return false when kind is not in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [{ count: 0 }]
            });

            const result = await repository.isKindInDossier(1, 999);

            expect(result).toBe(false);
        });

        it('should return false when query returns no results', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: []
            });

            const result = await repository.isKindInDossier(1, 999);

            expect(result).toBe(false);
        });
    });

    describe('isOuderLinkedToKind', () => {
        it('should return true when ouder is linked to kind', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [{ count: 1 }]
            });

            const result = await repository.isOuderLinkedToKind(1, 2);

            expect(result).toBe(true);
            expect(mockRequest.input).toHaveBeenCalledWith('kindId', 1);
            expect(mockRequest.input).toHaveBeenCalledWith('ouderId', 2);
        });

        it('should return false when ouder is not linked to kind', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [{ count: 0 }]
            });

            const result = await repository.isOuderLinkedToKind(1, 999);

            expect(result).toBe(false);
        });

        it('should return false when query returns no results', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: []
            });

            const result = await repository.isOuderLinkedToKind(1, 999);

            expect(result).toBe(false);
        });
    });

    describe('findDossiersByKindId', () => {
        it('should return empty array when kind not in any dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.findDossiersByKindId(1);

            expect(result).toEqual([]);
            expect(mockRequest.input).toHaveBeenCalledWith('kindId', 1);
        });

        it('should return array of dossier IDs', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    { dossier_id: 1 },
                    { dossier_id: 5 },
                    { dossier_id: 10 }
                ]
            });

            const result = await repository.findDossiersByKindId(1);

            expect(result).toEqual([1, 5, 10]);
        });
    });

    describe('countKinderenInDossier', () => {
        it('should return 0 when no kinderen in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [{ total: 0 }]
            });

            const result = await repository.countKinderenInDossier(1);

            expect(result).toBe(0);
            expect(mockRequest.input).toHaveBeenCalledWith('dossierId', 1);
        });

        it('should return count of kinderen in dossier', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [{ total: 5 }]
            });

            const result = await repository.countKinderenInDossier(1);

            expect(result).toBe(5);
        });

        it('should return 0 when query returns no results', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: []
            });

            const result = await repository.countKinderenInDossier(1);

            expect(result).toBe(0);
        });
    });

    describe('Data mapping validation', () => {
        it('should correctly map database fields to Persoon model', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        dossier_kind_id: 100,
                        id: 1,
                        voorletters: 'J.P.',
                        voornamen: 'Jan Piet',
                        roepnaam: 'JP',
                        geslacht: 'M',
                        tussenvoegsel: 'van der',
                        achternaam: 'Berg',
                        adres: 'Lange Straat 123',
                        postcode: '9876ZX',
                        plaats: 'Rotterdam',
                        geboorteplaats: 'Amsterdam',
                        geboorte_datum: new Date('2010-12-25'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: 'Belgische',
                        telefoon: '0698765432',
                        email: 'jp@example.com',
                        beroep: null
                    }
                ]
            });

            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.findByDossierId(1);

            expect(result[0].kind.voorletters).toBe('J.P.');
            expect(result[0].kind.voornamen).toBe('Jan Piet');
            expect(result[0].kind.tussenvoegsel).toBe('van der');
            expect(result[0].kind.nationaliteit2).toBe('Belgische');
        });

        it('should handle null values correctly', async () => {
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        dossier_kind_id: 100,
                        id: 1,
                        voorletters: 'J.',
                        voornamen: 'Jan',
                        roepnaam: 'Jan',
                        geslacht: 'M',
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
                        beroep: null
                    }
                ]
            });

            mockRequest.query.mockResolvedValueOnce({ recordset: [] });

            const result = await repository.findByDossierId(1);

            expect(result[0].kind.tussenvoegsel).toBeNull();
            expect(result[0].kind.adres).toBeNull();
            expect(result[0].kind.telefoon).toBeNull();
        });
    });

    describe('Complex scenarios', () => {
        it('should handle multiple kinderen in same dossier', async () => {
            // Two kinderen
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        dossier_kind_id: 100,
                        id: 1,
                        voorletters: 'J.',
                        voornamen: 'Jan',
                        roepnaam: 'Jan',
                        geslacht: 'M',
                        tussenvoegsel: null,
                        achternaam: 'Jansen',
                        adres: 'Straat 1',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Utrecht',
                        geboorte_datum: new Date('2015-03-15'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: null,
                        email: null,
                        beroep: null
                    },
                    {
                        dossier_kind_id: 101,
                        id: 2,
                        voorletters: 'P.',
                        voornamen: 'Piet',
                        roepnaam: 'Piet',
                        geslacht: 'M',
                        tussenvoegsel: null,
                        achternaam: 'Jansen',
                        adres: 'Straat 1',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Utrecht',
                        geboorte_datum: new Date('2017-08-20'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: null,
                        email: null,
                        beroep: null
                    }
                ]
            });

            // Ouders for first kind
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        kinderen_ouders_id: 200,
                        id: 10,
                        voorletters: 'H.',
                        voornamen: 'Hans',
                        roepnaam: 'Hans',
                        geslacht: 'M',
                        tussenvoegsel: null,
                        achternaam: 'Jansen',
                        adres: 'Straat 1',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Den Haag',
                        geboorte_datum: new Date('1985-01-01'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: '0612345678',
                        email: 'hans@example.com',
                        beroep: 'Engineer',
                        relatie_type_id: 1,
                        relatie_type_naam: 'Biologische vader'
                    }
                ]
            });

            // Ouders for second kind
            mockRequest.query.mockResolvedValueOnce({
                recordset: [
                    {
                        kinderen_ouders_id: 201,
                        id: 10,
                        voorletters: 'H.',
                        voornamen: 'Hans',
                        roepnaam: 'Hans',
                        geslacht: 'M',
                        tussenvoegsel: null,
                        achternaam: 'Jansen',
                        adres: 'Straat 1',
                        postcode: '1234AB',
                        plaats: 'Amsterdam',
                        geboorteplaats: 'Den Haag',
                        geboorte_datum: new Date('1985-01-01'),
                        nationaliteit_1: 'Nederlandse',
                        nationaliteit_2: null,
                        telefoon: '0612345678',
                        email: 'hans@example.com',
                        beroep: 'Engineer',
                        relatie_type_id: 1,
                        relatie_type_naam: 'Biologische vader'
                    }
                ]
            });

            const result = await repository.findByDossierId(1);

            expect(result).toHaveLength(2);
            expect(result[0].kind.voornamen).toBe('Jan');
            expect(result[1].kind.voornamen).toBe('Piet');
            // Both should have same ouder
            expect(result[0].ouders[0].ouder.id).toBe(10);
            expect(result[1].ouders[0].ouder.id).toBe(10);
        });
    });
});
