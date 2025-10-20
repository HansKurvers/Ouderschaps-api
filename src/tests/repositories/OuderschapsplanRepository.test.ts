import { OuderschapsplanRepository } from '../../repositories/OuderschapsplanRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { PartijRepository } from '../../repositories/PartijRepository';
import { KindRepository } from '../../repositories/KindRepository';
import { OmgangRepository } from '../../repositories/OmgangRepository';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { AlimentatieRepository } from '../../repositories/AlimentatieRepository';

// Mock all dependencies
jest.mock('../../repositories/DossierRepository');
jest.mock('../../repositories/PartijRepository');
jest.mock('../../repositories/KindRepository');
jest.mock('../../repositories/OmgangRepository');
jest.mock('../../repositories/ZorgRepository');
jest.mock('../../repositories/AlimentatieRepository');

describe('OuderschapsplanRepository', () => {
    let repository: OuderschapsplanRepository;
    let mockDossierRepo: jest.Mocked<DossierRepository>;
    let mockPartijRepo: jest.Mocked<PartijRepository>;
    let mockKindRepo: jest.Mocked<KindRepository>;
    let mockOmgangRepo: jest.Mocked<OmgangRepository>;
    let mockZorgRepo: jest.Mocked<ZorgRepository>;
    let mockAlimentatieRepo: jest.Mocked<AlimentatieRepository>;

    beforeEach(() => {
        // Create mocked instances
        mockDossierRepo = new DossierRepository() as jest.Mocked<DossierRepository>;
        mockPartijRepo = new PartijRepository() as jest.Mocked<PartijRepository>;
        mockKindRepo = new KindRepository() as jest.Mocked<KindRepository>;
        mockOmgangRepo = new OmgangRepository() as jest.Mocked<OmgangRepository>;
        mockZorgRepo = new ZorgRepository() as jest.Mocked<ZorgRepository>;
        mockAlimentatieRepo = new AlimentatieRepository() as jest.Mocked<AlimentatieRepository>;

        repository = new OuderschapsplanRepository();

        // Replace internal repositories with mocks
        (repository as any).dossierRepo = mockDossierRepo;
        (repository as any).partijRepo = mockPartijRepo;
        (repository as any).kindRepo = mockKindRepo;
        (repository as any).omgangRepo = mockOmgangRepo;
        (repository as any).zorgRepo = mockZorgRepo;
        (repository as any).alimentatieRepo = mockAlimentatieRepo;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ==================== getCompletePlan Tests ====================

    describe('getCompletePlan', () => {
        it('should orchestrate all repositories and return complete plan', async () => {
            // Arrange
            const mockDossier = { id: 1, dossierNummer: 'D001', gewijzigdOp: new Date('2025-01-01') };
            const mockPartijen = [
                { id: 1, persoon: { id: 1, achternaam: 'Jansen' }, rol: { id: 1, naam: 'Vader' } },
                { id: 2, persoon: { id: 2, achternaam: 'De Vries' }, rol: { id: 2, naam: 'Moeder' } }
            ];
            const mockKinderen = [{ kind: { id: 3, achternaam: 'Jansen' }, ouders: [] }];
            const mockOmgangEntries = [{ omgang: { id: 1, gewijzigdOp: new Date('2025-01-02') }, dag: {}, dagdeel: {} }];
            const mockSchedule = { weekA: {}, weekB: {} };
            const mockZorg = [{ zorg: { id: 1, gewijzigdOp: new Date('2025-01-03') }, categorie: {}, situatie: {} }];
            const mockAlimentatie = [{ alimentatie: { id: 1, gewijzigdOp: new Date('2025-01-04') } }];

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.findByDossierId.mockResolvedValue(mockPartijen as any);
            mockKindRepo.findByDossierId.mockResolvedValue(mockKinderen as any);
            mockOmgangRepo.findByDossierId.mockResolvedValue(mockOmgangEntries as any);
            mockOmgangRepo.getSchedule.mockResolvedValue(mockSchedule as any);
            mockZorgRepo.findByDossierId.mockResolvedValue(mockZorg as any);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue(mockAlimentatie as any);

            // Act
            const result = await repository.getCompletePlan(1);

            // Assert - Verify all repositories were called
            expect(mockDossierRepo.findById).toHaveBeenCalledWith(1);
            expect(mockPartijRepo.findByDossierId).toHaveBeenCalledWith(1);
            expect(mockKindRepo.findByDossierId).toHaveBeenCalledWith(1);
            expect(mockOmgangRepo.findByDossierId).toHaveBeenCalledWith(1);
            expect(mockOmgangRepo.getSchedule).toHaveBeenCalledWith(1);
            expect(mockZorgRepo.findByDossierId).toHaveBeenCalledWith(1);
            expect(mockAlimentatieRepo.findByDossierId).toHaveBeenCalledWith(1);

            // Assert - Verify result structure
            expect(result).toHaveProperty('dossier');
            expect(result).toHaveProperty('partijen');
            expect(result).toHaveProperty('kinderen');
            expect(result).toHaveProperty('omgang');
            expect(result).toHaveProperty('zorg');
            expect(result).toHaveProperty('alimentatie');
            expect(result).toHaveProperty('metadata');
            expect(result.metadata).toHaveProperty('volledigheid');
            expect(result.metadata).toHaveProperty('laatstGewijzigd');
        });

        it('should throw error when dossier not found', async () => {
            // Arrange
            mockDossierRepo.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(repository.getCompletePlan(999)).rejects.toThrow('Dossier not found');
        });

        it('should calculate volledigheid correctly when all sections complete', async () => {
            // Arrange
            const mockDossier = { id: 1, gewijzigdOp: new Date() };
            const mockPartijen = [{ id: 1 }, { id: 2 }]; // 2 partijen
            const mockKinderen = [{ kind: {} }]; // 1 kind
            const mockOmgang = [{ omgang: { gewijzigdOp: new Date() } }]; // 1 omgang
            const mockZorg = [{ zorg: { gewijzigdOp: new Date() } }]; // 1 zorg

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.findByDossierId.mockResolvedValue(mockPartijen as any);
            mockKindRepo.findByDossierId.mockResolvedValue(mockKinderen as any);
            mockOmgangRepo.findByDossierId.mockResolvedValue(mockOmgang as any);
            mockOmgangRepo.getSchedule.mockResolvedValue({} as any);
            mockZorgRepo.findByDossierId.mockResolvedValue(mockZorg as any);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([] as any);

            // Act
            const result = await repository.getCompletePlan(1);

            // Assert
            expect(result.metadata.volledigheid.heeftPartijen).toBe(true);
            expect(result.metadata.volledigheid.heeftKinderen).toBe(true);
            expect(result.metadata.volledigheid.heeftOmgang).toBe(true);
            expect(result.metadata.volledigheid.heeftZorg).toBe(true);
            expect(result.metadata.volledigheid.isCompleet).toBe(true);
            expect(result.metadata.volledigheid.percentageCompleet).toBe(100);
        });

        it('should use most recent gewijzigd_op date', async () => {
            // Arrange
            const mockDossier = { id: 1, gewijzigdOp: new Date('2025-01-01') };
            const mostRecentDate = new Date('2025-01-10');

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.findByDossierId.mockResolvedValue([{}, {}] as any);
            mockKindRepo.findByDossierId.mockResolvedValue([{}] as any);
            mockOmgangRepo.findByDossierId.mockResolvedValue([{ omgang: { gewijzigdOp: new Date('2025-01-05') } }] as any);
            mockOmgangRepo.getSchedule.mockResolvedValue({} as any);
            mockZorgRepo.findByDossierId.mockResolvedValue([{ zorg: { gewijzigdOp: mostRecentDate } }] as any);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([{ alimentatie: { gewijzigdOp: new Date('2025-01-08') } }] as any);

            // Act
            const result = await repository.getCompletePlan(1);

            // Assert
            expect(result.metadata.laatstGewijzigd).toEqual(mostRecentDate);
        });

        it('should include empty arrays when no data present', async () => {
            // Arrange
            const mockDossier = { id: 1, gewijzigdOp: new Date() };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.findByDossierId.mockResolvedValue([]);
            mockKindRepo.findByDossierId.mockResolvedValue([]);
            mockOmgangRepo.findByDossierId.mockResolvedValue([]);
            mockOmgangRepo.getSchedule.mockResolvedValue({} as any);
            mockZorgRepo.findByDossierId.mockResolvedValue([]);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getCompletePlan(1);

            // Assert
            expect(result.partijen).toEqual([]);
            expect(result.kinderen).toEqual([]);
            expect(result.omgang.entries).toEqual([]);
            expect(result.zorg).toEqual([]);
            expect(result.alimentatie).toEqual([]);
        });

        it('should include metadata with correct section count', async () => {
            // Arrange
            const mockDossier = { id: 1, gewijzigdOp: new Date() };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.findByDossierId.mockResolvedValue([{}, {}] as any); // Complete
            mockKindRepo.findByDossierId.mockResolvedValue([{}] as any); // Complete
            mockOmgangRepo.findByDossierId.mockResolvedValue([{ omgang: { gewijzigdOp: new Date() } }] as any); // Complete
            mockOmgangRepo.getSchedule.mockResolvedValue({} as any);
            mockZorgRepo.findByDossierId.mockResolvedValue([]); // Incomplete
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getCompletePlan(1);

            // Assert
            expect(result.metadata.aantalSectiesCompleet).toBe(3); // partijen, kinderen, omgang
            expect(result.metadata.totaalSecties).toBe(5);
        });
    });

    // ==================== getPlanSummary Tests ====================

    describe('getPlanSummary', () => {
        it('should return summary with counts', async () => {
            // Arrange
            const mockDossier = { id: 1, dossierNummer: 'D001', gewijzigdOp: new Date() };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(3);
            mockOmgangRepo.count.mockResolvedValue(5);
            mockZorgRepo.count.mockResolvedValue(4);
            mockAlimentatieRepo.count.mockResolvedValue(1);
            mockOmgangRepo.findByDossierId.mockResolvedValue([]);
            mockZorgRepo.findByDossierId.mockResolvedValue([]);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getPlanSummary(1);

            // Assert
            expect(result.dossierId).toBe(1);
            expect(result.dossierNummer).toBe('D001');
            expect(result.aantalPartijen).toBe(2);
            expect(result.aantalKinderen).toBe(3);
            expect(result.aantalOmgangRegelingen).toBe(5);
            expect(result.aantalZorgRegelingen).toBe(4);
            expect(result.aantalAlimentatieRegelingen).toBe(1);
        });

        it('should throw error when dossier not found', async () => {
            // Arrange
            mockDossierRepo.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(repository.getPlanSummary(999)).rejects.toThrow('Dossier not found');
        });

        it('should include volledigheid in summary', async () => {
            // Arrange
            const mockDossier = { id: 1, dossierNummer: 'D001', gewijzigdOp: new Date() };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.count.mockResolvedValue(2); // Complete
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1); // Complete
            mockOmgangRepo.count.mockResolvedValue(1); // Complete
            mockZorgRepo.count.mockResolvedValue(1); // Complete
            mockAlimentatieRepo.count.mockResolvedValue(0);
            mockOmgangRepo.findByDossierId.mockResolvedValue([]);
            mockZorgRepo.findByDossierId.mockResolvedValue([]);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getPlanSummary(1);

            // Assert
            expect(result.volledigheid.isCompleet).toBe(true);
            expect(result.volledigheid.percentageCompleet).toBe(100);
        });
    });

    // ==================== validatePlanCompleteness Tests ====================

    describe('validatePlanCompleteness', () => {
        it('should return 100% when all required sections present', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.isCompleet).toBe(true);
            expect(result.percentageCompleet).toBe(100);
            expect(result.heeftPartijen).toBe(true);
            expect(result.heeftKinderen).toBe(true);
            expect(result.heeftOmgang).toBe(true);
            expect(result.heeftZorg).toBe(true);
        });

        it('should return 75% when 3 of 4 required sections present', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(0); // Missing zorg
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.isCompleet).toBe(false);
            expect(result.percentageCompleet).toBe(75);
            expect(result.heeftZorg).toBe(false);
        });

        it('should return 50% when 2 of 4 required sections present', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(0); // Missing
            mockZorgRepo.count.mockResolvedValue(0); // Missing
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.percentageCompleet).toBe(50);
            expect(result.heeftOmgang).toBe(false);
            expect(result.heeftZorg).toBe(false);
        });

        it('should return 25% when 1 of 4 required sections present', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(0); // Missing
            mockOmgangRepo.count.mockResolvedValue(0); // Missing
            mockZorgRepo.count.mockResolvedValue(0); // Missing
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.percentageCompleet).toBe(25);
            expect(result.heeftPartijen).toBe(true);
            expect(result.heeftKinderen).toBe(false);
        });

        it('should return 0% when no sections present', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(0);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(0);
            mockOmgangRepo.count.mockResolvedValue(0);
            mockZorgRepo.count.mockResolvedValue(0);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.percentageCompleet).toBe(0);
            expect(result.isCompleet).toBe(false);
        });
    });

    // ==================== Business Rules Tests ====================

    describe('Business Rules', () => {
        it('should require at least 2 partijen for completeness', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(1); // Only 1 partij
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.heeftPartijen).toBe(false);
            expect(result.isCompleet).toBe(false);
        });

        it('should require at least 1 kind for completeness', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(0); // No kinderen
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.heeftKinderen).toBe(false);
            expect(result.isCompleet).toBe(false);
        });

        it('should require at least 1 omgang for completeness', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(0); // No omgang
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.heeftOmgang).toBe(false);
            expect(result.isCompleet).toBe(false);
        });

        it('should require at least 1 zorg for completeness', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(0); // No zorg
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.heeftZorg).toBe(false);
            expect(result.isCompleet).toBe(false);
        });

        it('should treat alimentatie as optional', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0); // No alimentatie

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            // Should still be complete without alimentatie
            expect(result.isCompleet).toBe(true);
            expect(result.percentageCompleet).toBe(100);
        });

        it('should accept more than required minimum (>2 partijen)', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(3); // 3 partijen
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.heeftPartijen).toBe(true);
            expect(result.isCompleet).toBe(true);
        });

        it('should accept multiple kinderen', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(5); // 5 kinderen
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.validatePlanCompleteness(1);

            // Assert
            expect(result.heeftKinderen).toBe(true);
            expect(result.isCompleet).toBe(true);
        });
    });

    // ==================== isPlanComplete Tests ====================

    describe('isPlanComplete', () => {
        it('should return true when plan is complete', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.isPlanComplete(1);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when plan is incomplete', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(0); // Missing kinderen
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.isPlanComplete(1);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when multiple sections missing', async () => {
            // Arrange
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(0);
            mockOmgangRepo.count.mockResolvedValue(0);
            mockZorgRepo.count.mockResolvedValue(0);
            mockAlimentatieRepo.count.mockResolvedValue(0);

            // Act
            const result = await repository.isPlanComplete(1);

            // Assert
            expect(result).toBe(false);
        });
    });

    // ==================== getPlanMetadata Tests ====================

    describe('getPlanMetadata', () => {
        it('should return metadata with volledigheid and timestamp', async () => {
            // Arrange
            const mockDossier = { id: 1, gewijzigdOp: new Date('2025-01-01') };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.count.mockResolvedValue(2);
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1);
            mockOmgangRepo.count.mockResolvedValue(1);
            mockZorgRepo.count.mockResolvedValue(1);
            mockAlimentatieRepo.count.mockResolvedValue(0);
            mockOmgangRepo.findByDossierId.mockResolvedValue([]);
            mockZorgRepo.findByDossierId.mockResolvedValue([]);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getPlanMetadata(1);

            // Assert
            expect(result).toHaveProperty('volledigheid');
            expect(result).toHaveProperty('laatstGewijzigd');
            expect(result).toHaveProperty('aantalSectiesCompleet');
            expect(result).toHaveProperty('totaalSecties');
            expect(result.totaalSecties).toBe(5);
        });

        it('should calculate correct section count in metadata', async () => {
            // Arrange
            const mockDossier = { id: 1, gewijzigdOp: new Date() };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockPartijRepo.count.mockResolvedValue(2); // Complete
            mockKindRepo.countKinderenInDossier.mockResolvedValue(1); // Complete
            mockOmgangRepo.count.mockResolvedValue(0); // Incomplete
            mockZorgRepo.count.mockResolvedValue(0); // Incomplete
            mockAlimentatieRepo.count.mockResolvedValue(0);
            mockOmgangRepo.findByDossierId.mockResolvedValue([]);
            mockZorgRepo.findByDossierId.mockResolvedValue([]);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getPlanMetadata(1);

            // Assert
            expect(result.aantalSectiesCompleet).toBe(2); // partijen and kinderen
            expect(result.totaalSecties).toBe(5);
        });
    });

    // ==================== getLastModifiedDate Tests ====================

    describe('getLastModifiedDate', () => {
        it('should return dossier date when no related data', async () => {
            // Arrange
            const dossierDate = new Date('2025-01-01');
            const mockDossier = { id: 1, gewijzigdOp: dossierDate };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockOmgangRepo.findByDossierId.mockResolvedValue([]);
            mockZorgRepo.findByDossierId.mockResolvedValue([]);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getLastModifiedDate(1);

            // Assert
            expect(result).toEqual(dossierDate);
        });

        it('should return omgang date when most recent', async () => {
            // Arrange
            const dossierDate = new Date('2025-01-01');
            const omgangDate = new Date('2025-01-15');
            const mockDossier = { id: 1, gewijzigdOp: dossierDate };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockOmgangRepo.findByDossierId.mockResolvedValue([{ omgang: { gewijzigdOp: omgangDate } }] as any);
            mockZorgRepo.findByDossierId.mockResolvedValue([]);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getLastModifiedDate(1);

            // Assert
            expect(result).toEqual(omgangDate);
        });

        it('should return zorg date when most recent', async () => {
            // Arrange
            const dossierDate = new Date('2025-01-01');
            const zorgDate = new Date('2025-01-20');
            const mockDossier = { id: 1, gewijzigdOp: dossierDate };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockOmgangRepo.findByDossierId.mockResolvedValue([]);
            mockZorgRepo.findByDossierId.mockResolvedValue([{ zorg: { gewijzigdOp: zorgDate } }] as any);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([]);

            // Act
            const result = await repository.getLastModifiedDate(1);

            // Assert
            expect(result).toEqual(zorgDate);
        });

        it('should return alimentatie date when most recent', async () => {
            // Arrange
            const dossierDate = new Date('2025-01-01');
            const alimentatieDate = new Date('2025-01-25');
            const mockDossier = { id: 1, gewijzigdOp: dossierDate };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockOmgangRepo.findByDossierId.mockResolvedValue([]);
            mockZorgRepo.findByDossierId.mockResolvedValue([]);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([{ alimentatie: { gewijzigdOp: alimentatieDate } }] as any);

            // Act
            const result = await repository.getLastModifiedDate(1);

            // Assert
            expect(result).toEqual(alimentatieDate);
        });

        it('should compare multiple entries and return most recent', async () => {
            // Arrange
            const dossierDate = new Date('2025-01-01');
            const mostRecentDate = new Date('2025-01-30');
            const mockDossier = { id: 1, gewijzigdOp: dossierDate };

            mockDossierRepo.findById.mockResolvedValue(mockDossier as any);
            mockOmgangRepo.findByDossierId.mockResolvedValue([
                { omgang: { gewijzigdOp: new Date('2025-01-10') } },
                { omgang: { gewijzigdOp: new Date('2025-01-15') } }
            ] as any);
            mockZorgRepo.findByDossierId.mockResolvedValue([
                { zorg: { gewijzigdOp: new Date('2025-01-20') } },
                { zorg: { gewijzigdOp: mostRecentDate } }
            ] as any);
            mockAlimentatieRepo.findByDossierId.mockResolvedValue([
                { alimentatie: { gewijzigdOp: new Date('2025-01-25') } }
            ] as any);

            // Act
            const result = await repository.getLastModifiedDate(1);

            // Assert
            expect(result).toEqual(mostRecentDate);
        });

        it('should throw error when dossier not found', async () => {
            // Arrange
            mockDossierRepo.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(repository.getLastModifiedDate(999)).rejects.toThrow('Dossier not found');
        });
    });

    // ==================== Error Handling Tests ====================

    describe('Error Handling', () => {
        it('should handle database errors in getCompletePlan', async () => {
            // Arrange
            mockDossierRepo.findById.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(repository.getCompletePlan(1)).rejects.toThrow('Database error');
        });

        it('should handle database errors in getPlanSummary', async () => {
            // Arrange
            mockDossierRepo.findById.mockRejectedValue(new Error('Connection lost'));

            // Act & Assert
            await expect(repository.getPlanSummary(1)).rejects.toThrow('Connection lost');
        });

        it('should handle database errors in validatePlanCompleteness', async () => {
            // Arrange
            mockPartijRepo.count.mockRejectedValue(new Error('Query timeout'));

            // Act & Assert
            await expect(repository.validatePlanCompleteness(1)).rejects.toThrow('Query timeout');
        });
    });
});
