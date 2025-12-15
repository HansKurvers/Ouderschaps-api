/**
 * RDW Service
 *
 * Haalt voertuiggegevens op via RDW Open Data API.
 * Gratis API, geen authenticatie nodig.
 *
 * API Endpoint:
 * - Basis voertuigdata: https://opendata.rdw.nl/resource/m9d7-ebf2.json
 *
 * Beschikbare velden: merk, handelsbenaming (type), voertuigsoort, kleur
 * Let op: catalogusprijs is niet publiek beschikbaar in RDW Open Data
 */

export interface RdwResult {
    kenteken: string;
    merk: string;
    handelsbenaming: string;
    voertuigsoort?: string;
    eersteTenaamstelling?: string;
    kleur?: string;
}

interface RdwCacheEntry {
    result: RdwResult;
    timestamp: number;
}

interface RdwVoertuigResponse {
    kenteken?: string;
    merk?: string;
    handelsbenaming?: string;
    voertuigsoort?: string;
    datum_eerste_tenaamstelling_in_nederland?: string;
    eerste_kleur?: string;
}

export class RdwService {
    private cache: Map<string, RdwCacheEntry> = new Map();

    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 uur

    private readonly RDW_VOERTUIG_BASE =
        'https://opendata.rdw.nl/resource/m9d7-ebf2.json';

    /**
     * Hoofdmethode: Voertuig opzoeken op basis van kenteken
     */
    async lookupByKenteken(kenteken: string): Promise<RdwResult> {
        // Normaliseer kenteken (uppercase, geen streepjes/spaties)
        const normalizedKenteken = this.normalizeKenteken(kenteken);

        // Check cache
        const cached = this.getFromCache(normalizedKenteken);
        if (cached) {
            return cached;
        }

        // Fetch voertuig basisgegevens
        const voertuigData = await this.getVoertuigData(normalizedKenteken);

        if (!voertuigData) {
            throw new Error('Kenteken niet gevonden');
        }

        // Combineer resultaten
        const result: RdwResult = {
            kenteken: normalizedKenteken,
            merk: voertuigData.merk || 'Onbekend',
            handelsbenaming: voertuigData.handelsbenaming || 'Onbekend',
            voertuigsoort: voertuigData.voertuigsoort,
            eersteTenaamstelling:
                voertuigData.datum_eerste_tenaamstelling_in_nederland,
            kleur: voertuigData.eerste_kleur,
        };

        // Cache resultaat
        this.setCache(normalizedKenteken, result);

        return result;
    }

    /**
     * Normaliseer kenteken: uppercase, geen streepjes/spaties
     */
    private normalizeKenteken(kenteken: string): string {
        return kenteken.toUpperCase().replace(/[\s-]/g, '');
    }

    /**
     * RDW Voertuig API: kenteken -> basisgegevens
     */
    private async getVoertuigData(
        kenteken: string
    ): Promise<RdwVoertuigResponse | null> {
        const url = `${this.RDW_VOERTUIG_BASE}?kenteken=${encodeURIComponent(kenteken)}`;

        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'OuderschapsApi/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(`RDW API fout: ${response.status}`);
        }

        const data = (await response.json()) as RdwVoertuigResponse[];

        if (!data || data.length === 0) {
            return null;
        }

        return data[0];
    }

    /**
     * Cache helpers
     */
    private getFromCache(kenteken: string): RdwResult | null {
        const entry = this.cache.get(kenteken);
        if (!entry) return null;

        // Check of cache nog geldig is
        if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
            this.cache.delete(kenteken);
            return null;
        }

        return entry.result;
    }

    private setCache(kenteken: string, result: RdwResult): void {
        this.cache.set(kenteken, {
            result,
            timestamp: Date.now(),
        });
    }

    /**
     * Cache leegmaken (voor tests of admin)
     */
    clearCache(): void {
        this.cache.clear();
    }
}

// Singleton instance
export const rdwService = new RdwService();
