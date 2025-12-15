/**
 * WOZ Service
 *
 * Haalt WOZ-waarden op via:
 * 1. PDOK Locatieserver (adres -> nummeraanduidingId)
 * 2. Kadaster WOZ API (nummeraanduidingId -> WOZ waarde)
 *
 * Geen sessie management nodig - Kadaster API is publiek toegankelijk.
 */

export interface WozResult {
    waarde: number;
    peildatum: string;
    adres?: string;
}

interface WozCacheEntry {
    result: WozResult;
    timestamp: number;
}

interface PdokResponse {
    response: {
        numFound: number;
        docs: Array<{
            nummeraanduiding_id?: string;
            weergavenaam?: string;
            id?: string;
        }>;
    };
}

interface KadasterWozResponse {
    wozObject?: {
        woonplaatsnaam?: string;
        straatnaam?: string;
        postcode?: string;
        huisnummer?: number;
        huisletter?: string | null;
        huisnummertoevoeging?: string | null;
        grondoppervlakte?: number;
    };
    wozWaarden?: Array<{
        peildatum: string;
        vastgesteldeWaarde: number;
    }>;
}

export class WozService {
    private cache: Map<string, WozCacheEntry> = new Map();

    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 uur

    private readonly PDOK_BASE =
        'https://api.pdok.nl/bzk/locatieserver/search/v3_1';
    private readonly KADASTER_WOZ_BASE =
        'https://api.kadaster.nl/lvwoz/wozwaardeloket-api/v1';

    /**
     * Hoofdmethode: WOZ waarde opzoeken op basis van adres
     */
    async lookupWozByAddress(
        postcode: string,
        huisnummer: string,
        toevoeging?: string
    ): Promise<WozResult> {
        // Normaliseer postcode (verwijder spaties, uppercase)
        const normalizedPostcode = postcode.toUpperCase().replace(/\s/g, '');

        // Check cache
        const cacheKey = `${normalizedPostcode}-${huisnummer}-${toevoeging || ''}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        // Stap 1: PDOK - Haal nummeraanduidingId op
        const pdokResult = await this.getNummeraanduidingId(
            normalizedPostcode,
            huisnummer,
            toevoeging
        );

        if (!pdokResult.nummeraanduidingId) {
            throw new Error('Adres niet gevonden');
        }

        // Stap 2: Kadaster WOZ API - Haal WOZ waarde op
        const wozResult = await this.getWozWaarde(pdokResult.nummeraanduidingId);

        // Combineer resultaten
        const result: WozResult = {
            waarde: wozResult.waarde,
            peildatum: wozResult.peildatum,
            adres: pdokResult.adres || wozResult.adres,
        };

        // Cache resultaat
        this.setCache(cacheKey, result);

        return result;
    }

    /**
     * PDOK Locatieserver: postcode + huisnummer -> nummeraanduidingId
     */
    private async getNummeraanduidingId(
        postcode: string,
        huisnummer: string,
        toevoeging?: string
    ): Promise<{ nummeraanduidingId: string | null; adres?: string }> {
        // Bouw zoekquery
        let query = `${postcode} ${huisnummer}`;
        if (toevoeging) {
            query += ` ${toevoeging}`;
        }

        const url = `${this.PDOK_BASE}/free?q=${encodeURIComponent(query)}&fq=type:adres&rows=1&fl=nummeraanduiding_id,weergavenaam,id`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`PDOK API fout: ${response.status}`);
        }

        const data = (await response.json()) as PdokResponse;

        if (!data.response?.docs?.length) {
            return { nummeraanduidingId: null };
        }

        const doc = data.response.docs[0];

        // nummeraanduiding_id kan direct beschikbaar zijn, of via id veld (adr-xxx formaat)
        let nummeraanduidingId = doc.nummeraanduiding_id;
        if (!nummeraanduidingId && doc.id?.startsWith('adr-')) {
            nummeraanduidingId = doc.id.replace('adr-', '');
        }

        return {
            nummeraanduidingId: nummeraanduidingId || null,
            adres: doc.weergavenaam,
        };
    }

    /**
     * Kadaster WOZ API: nummeraanduidingId -> WOZ waarde + peildatum
     * Publiek toegankelijke API, geen authenticatie nodig.
     */
    private async getWozWaarde(
        nummeraanduidingId: string
    ): Promise<{ waarde: number; peildatum: string; adres?: string }> {
        const url = `${this.KADASTER_WOZ_BASE}/wozwaarde/nummeraanduiding/${nummeraanduidingId}`;

        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'OuderschapsApi/1.0',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Geen WOZ-waarde beschikbaar voor dit adres');
            }
            throw new Error(`Kadaster WOZ API fout: ${response.status}`);
        }

        const data = (await response.json()) as KadasterWozResponse;

        if (!data.wozWaarden?.length) {
            throw new Error('Geen WOZ-waarde beschikbaar voor dit adres');
        }

        // Vind de meest recente WOZ waarde (hoogste peildatum)
        const sortedWaarden = [...data.wozWaarden].sort(
            (a, b) =>
                new Date(b.peildatum).getTime() - new Date(a.peildatum).getTime()
        );

        const recentste = sortedWaarden[0];

        // Bouw adres string uit wozObject
        let adres: string | undefined;
        if (data.wozObject) {
            const obj = data.wozObject;
            const huisnrDeel = [
                obj.huisnummer,
                obj.huisletter,
                obj.huisnummertoevoeging,
            ]
                .filter(Boolean)
                .join('');
            adres = `${obj.straatnaam} ${huisnrDeel}, ${obj.postcode} ${obj.woonplaatsnaam}`;
        }

        return {
            waarde: recentste.vastgesteldeWaarde,
            peildatum: recentste.peildatum,
            adres,
        };
    }

    /**
     * Cache helpers
     */
    private getFromCache(key: string): WozResult | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check of cache nog geldig is
        if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return entry.result;
    }

    private setCache(key: string, result: WozResult): void {
        this.cache.set(key, {
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
export const wozService = new WozService();
