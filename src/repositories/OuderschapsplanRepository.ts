import { IOuderschapsplanRepository } from './interfaces/IOuderschapsplanRepository';
import { CompletePlan, PlanSummary, PlanVolledigheid, PlanMetadata } from '../models/Dossier';
import { DossierRepository } from './DossierRepository';
import { PartijRepository } from './PartijRepository';
import { KindRepository } from './KindRepository';
import { OmgangRepository } from './OmgangRepository';
import { ZorgRepository } from './ZorgRepository';
import { AlimentatieRepository } from './AlimentatieRepository';

/**
 * Ouderschapsplan Repository - THE MASTER ORCHESTRATOR
 *
 * This is THE HEART of the application - where all repositories
 * come together to generate a complete ouderschapsplan (parenting plan).
 *
 * This repository orchestrates:
 * - DossierRepository: Basic dossier information
 * - PartijRepository: Parents/parties involved
 * - KindRepository: Children and parent-child relationships
 * - OmgangRepository: Visitation schedules and arrangements
 * - ZorgRepository: Care arrangements and responsibilities
 * - AlimentatieRepository: Child support agreements
 *
 * Key Features:
 * - Parallel fetching for optimal performance
 * - Completeness validation with business rules
 * - Metadata generation and statistics
 * - Unified data structure for frontend consumption
 * - Last modified tracking across all entities
 *
 * Business Rules:
 * - Requires at least 2 parties (both parents)
 * - Requires at least 1 child
 * - Requires at least 1 visitation arrangement
 * - Requires at least 1 care arrangement
 * - Child support is optional
 *
 * This is where EVERYTHING comes together! 🎯
 */
export class OuderschapsplanRepository implements IOuderschapsplanRepository {
    private dossierRepo: DossierRepository;
    private partijRepo: PartijRepository;
    private kindRepo: KindRepository;
    private omgangRepo: OmgangRepository;
    private zorgRepo: ZorgRepository;
    private alimentatieRepo: AlimentatieRepository;

    constructor() {
        this.dossierRepo = new DossierRepository();
        this.partijRepo = new PartijRepository();
        this.kindRepo = new KindRepository();
        this.omgangRepo = new OmgangRepository();
        this.zorgRepo = new ZorgRepository();
        this.alimentatieRepo = new AlimentatieRepository();
    }

    /**
     * Get complete ouderschapsplan with ALL related data
     *
     * This is the MAIN METHOD that orchestrates all repositories
     * to build a unified view of the complete parenting plan.
     *
     * Performance optimization: Uses Promise.all to fetch all data
     * in parallel, reducing total query time significantly.
     *
     * @param dossierId The dossier ID
     * @returns Complete plan with all data and metadata
     * @throws Error if dossier not found
     */
    async getCompletePlan(dossierId: number): Promise<CompletePlan> {
        // Fetch all data in parallel for optimal performance
        const [
            dossier,
            partijen,
            kinderen,
            omgangEntries,
            omgangSchedule,
            zorg,
            alimentatie
        ] = await Promise.all([
            this.dossierRepo.findById(dossierId),
            this.partijRepo.findByDossierId(dossierId),
            this.kindRepo.findByDossierId(dossierId),
            this.omgangRepo.findByDossierId(dossierId),
            this.omgangRepo.getSchedule(dossierId),
            this.zorgRepo.findByDossierId(dossierId),
            this.alimentatieRepo.findByDossierId(dossierId)
        ]);

        if (!dossier) {
            throw new Error('Dossier not found');
        }

        // Calculate completeness based on actual data
        const volledigheid = this.calculateVolledigheid(
            partijen,
            kinderen,
            omgangEntries,
            zorg,
            alimentatie
        );

        // Get last modified date across all entities
        const laatstGewijzigd = await this.getLastModifiedDate(dossierId);

        // Build metadata
        const metadata: PlanMetadata = {
            volledigheid,
            laatstGewijzigd,
            aantalSectiesCompleet: this.countCompleteSections(volledigheid),
            totaalSecties: 5 // partijen, kinderen, omgang, zorg, alimentatie
        };

        return {
            dossier,
            partijen,
            kinderen,
            omgang: {
                schedule: omgangSchedule,
                entries: omgangEntries
            },
            zorg,
            alimentatie,
            metadata
        };
    }

    /**
     * Get plan summary for overview/list views
     *
     * More efficient than getCompletePlan for list views.
     * Only fetches counts instead of full data.
     *
     * Use this when displaying lists of dossiers or quick overviews.
     * For detailed plan view, use getCompletePlan().
     *
     * @param dossierId The dossier ID
     * @returns Summary with counts and metadata
     * @throws Error if dossier not found
     */
    async getPlanSummary(dossierId: number): Promise<PlanSummary> {
        const dossier = await this.dossierRepo.findById(dossierId);

        if (!dossier) {
            throw new Error('Dossier not found');
        }

        // Get counts in parallel (more efficient than fetching all data)
        const [
            aantalPartijen,
            aantalKinderen,
            aantalOmgang,
            aantalZorg,
            aantalAlimentatie
        ] = await Promise.all([
            this.partijRepo.count(dossierId),
            this.kindRepo.countKinderenInDossier(dossierId),
            this.omgangRepo.count(dossierId),
            this.zorgRepo.count(dossierId),
            this.alimentatieRepo.count(dossierId)
        ]);

        // Calculate volledigheid from counts
        const volledigheid = this.calculateVolledigheidFromCounts(
            aantalPartijen,
            aantalKinderen,
            aantalOmgang,
            aantalZorg,
            aantalAlimentatie
        );

        const laatstGewijzigd = await this.getLastModifiedDate(dossierId);

        return {
            dossierId: dossier.id,
            dossierNummer: dossier.dossierNummer,
            aantalPartijen,
            aantalKinderen,
            aantalOmgangRegelingen: aantalOmgang,
            aantalZorgRegelingen: aantalZorg,
            aantalAlimentatieRegelingen: aantalAlimentatie,
            volledigheid,
            laatstGewijzigd
        };
    }

    /**
     * Validate plan completeness
     *
     * Checks if all required sections are filled according to business rules:
     * - Requires at least 2 parties (both parents)
     * - Requires at least 1 child
     * - Requires at least 1 visitation arrangement
     * - Requires at least 1 care arrangement
     * - Child support is optional (not counted in completeness)
     *
     * Returns detailed validation including percentage complete.
     *
     * @param dossierId The dossier ID
     * @returns Completeness validation with percentage
     */
    async validatePlanCompleteness(dossierId: number): Promise<PlanVolledigheid> {
        const [
            aantalPartijen,
            aantalKinderen,
            aantalOmgang,
            aantalZorg,
            aantalAlimentatie
        ] = await Promise.all([
            this.partijRepo.count(dossierId),
            this.kindRepo.countKinderenInDossier(dossierId),
            this.omgangRepo.count(dossierId),
            this.zorgRepo.count(dossierId),
            this.alimentatieRepo.count(dossierId)
        ]);

        return this.calculateVolledigheidFromCounts(
            aantalPartijen,
            aantalKinderen,
            aantalOmgang,
            aantalZorg,
            aantalAlimentatie
        );
    }

    /**
     * Check if plan is complete
     *
     * Convenience method that returns true only if all required sections
     * are filled. This is simpler than validatePlanCompleteness() when you
     * only need a boolean result.
     *
     * @param dossierId The dossier ID
     * @returns True if plan is complete, false otherwise
     */
    async isPlanComplete(dossierId: number): Promise<boolean> {
        const volledigheid = await this.validatePlanCompleteness(dossierId);
        return volledigheid.isCompleet;
    }

    /**
     * Get plan metadata only
     *
     * Efficient way to get completeness and timestamps without
     * fetching all plan data. Use this when you only need to check
     * completeness or last modified date.
     *
     * @param dossierId The dossier ID
     * @returns Metadata with completeness and stats
     */
    async getPlanMetadata(dossierId: number): Promise<PlanMetadata> {
        const volledigheid = await this.validatePlanCompleteness(dossierId);
        const laatstGewijzigd = await this.getLastModifiedDate(dossierId);

        return {
            volledigheid,
            laatstGewijzigd,
            aantalSectiesCompleet: this.countCompleteSections(volledigheid),
            totaalSecties: 5
        };
    }

    /**
     * Get last modified date from all related entities
     *
     * Checks dossier, omgang, zorg, and alimentatie tables
     * and returns the most recent gewijzigd_op timestamp.
     *
     * This is important for cache invalidation and showing
     * users when the plan was last updated.
     *
     * @param dossierId The dossier ID
     * @returns Most recent modification date
     * @throws Error if dossier not found
     */
    async getLastModifiedDate(dossierId: number): Promise<Date> {
        const dossier = await this.dossierRepo.findById(dossierId);

        if (!dossier) {
            throw new Error('Dossier not found');
        }

        // Start with dossier's gewijzigd_op
        let latest = dossier.gewijzigdOp;

        // Get all related data dates in parallel
        const [omgangData, zorgData, alimentatieData] = await Promise.all([
            this.omgangRepo.findByDossierId(dossierId),
            this.zorgRepo.findByDossierId(dossierId),
            this.alimentatieRepo.findByDossierId(dossierId)
        ]);

        // Find most recent gewijzigd_op across all entities
        omgangData.forEach(o => {
            if (o.omgang.gewijzigdOp > latest) {
                latest = o.omgang.gewijzigdOp;
            }
        });

        zorgData.forEach(z => {
            if (z.zorg.gewijzigdOp > latest) {
                latest = z.zorg.gewijzigdOp;
            }
        });

        alimentatieData.forEach(a => {
            if (a.alimentatie.gewijzigdOp > latest) {
                latest = a.alimentatie.gewijzigdOp;
            }
        });

        return latest;
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Calculate volledigheid from actual data arrays
     *
     * Business rules:
     * - Requires at least 2 parties (both parents)
     * - Requires at least 1 child
     * - Requires at least 1 visitation arrangement
     * - Requires at least 1 care arrangement
     * - Child support is optional (not counted in required sections)
     *
     * @param partijen Array of parties
     * @param kinderen Array of children
     * @param omgang Array of visitation entries
     * @param zorg Array of care entries
     * @param alimentatie Array of child support entries
     * @returns Completeness validation
     */
    private calculateVolledigheid(
        partijen: any[],
        kinderen: any[],
        omgang: any[],
        zorg: any[],
        alimentatie: any[]
    ): PlanVolledigheid {
        const heeftPartijen = partijen.length >= 2; // Minimum 2 parents
        const heeftKinderen = kinderen.length >= 1;
        const heeftOmgang = omgang.length >= 1;
        const heeftZorg = zorg.length >= 1;
        const heeftAlimentatie = alimentatie.length >= 0; // Optional, always true

        const requiredSections = 4; // partijen, kinderen, omgang, zorg (alimentatie is optional)
        let completeSections = 0;

        if (heeftPartijen) completeSections++;
        if (heeftKinderen) completeSections++;
        if (heeftOmgang) completeSections++;
        if (heeftZorg) completeSections++;

        const percentageCompleet = Math.round((completeSections / requiredSections) * 100);
        const isCompleet = completeSections === requiredSections;

        return {
            heeftPartijen,
            heeftKinderen,
            heeftOmgang,
            heeftZorg,
            heeftAlimentatie,
            isCompleet,
            percentageCompleet
        };
    }

    /**
     * Calculate volledigheid from counts (more efficient for summaries)
     *
     * Same business rules as calculateVolledigheid() but works with
     * counts instead of full data arrays. More efficient for summaries.
     *
     * @param aantalPartijen Number of parties
     * @param aantalKinderen Number of children
     * @param aantalOmgang Number of visitation entries
     * @param aantalZorg Number of care entries
     * @param aantalAlimentatie Number of child support entries
     * @returns Completeness validation
     */
    private calculateVolledigheidFromCounts(
        aantalPartijen: number,
        aantalKinderen: number,
        aantalOmgang: number,
        aantalZorg: number,
        aantalAlimentatie: number
    ): PlanVolledigheid {
        const heeftPartijen = aantalPartijen >= 2;
        const heeftKinderen = aantalKinderen >= 1;
        const heeftOmgang = aantalOmgang >= 1;
        const heeftZorg = aantalZorg >= 1;
        const heeftAlimentatie = aantalAlimentatie >= 0; // Optional

        const requiredSections = 4;
        let completeSections = 0;

        if (heeftPartijen) completeSections++;
        if (heeftKinderen) completeSections++;
        if (heeftOmgang) completeSections++;
        if (heeftZorg) completeSections++;

        const percentageCompleet = Math.round((completeSections / requiredSections) * 100);
        const isCompleet = completeSections === requiredSections;

        return {
            heeftPartijen,
            heeftKinderen,
            heeftOmgang,
            heeftZorg,
            heeftAlimentatie,
            isCompleet,
            percentageCompleet
        };
    }

    /**
     * Count number of complete sections
     *
     * Counts how many of the 4 required sections are complete.
     * Does NOT count alimentatie as it's optional.
     *
     * @param volledigheid Completeness validation
     * @returns Number of complete sections (0-4)
     */
    private countCompleteSections(volledigheid: PlanVolledigheid): number {
        let count = 0;
        if (volledigheid.heeftPartijen) count++;
        if (volledigheid.heeftKinderen) count++;
        if (volledigheid.heeftOmgang) count++;
        if (volledigheid.heeftZorg) count++;
        // alimentatie is optional, don't count
        return count;
    }
}
