/**
 * WOZ Service
 *
 * Haalt WOZ-waarden op via:
 * 1. PDOK Locatieserver (adres -> nummeraanduidingId)
 * 2. WOZ-waardeloket API (nummeraanduidingId -> WOZ waarde)
 *
 * Vereist sessie management voor WOZ-waardeloket (cookies)
 */

export interface WozResult {
    waarde: number;
    peildatum: string;
    adres?: string;
}

interface WozSession {
    awafSid: string;
    sessionId: string;
    lbSticky: string;
    createdAt: number;
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

interface WozWaardeResponse {
    wozObject?: {
        adres?: string;
        grondoppervlakte?: number;
        gebruiksoppervlakte?: number;
        bouwjaar?: number;
    };
    wozWaarden?: Array<{
        peildatum: string;
        vastgesteldeWaarde: number;
    }>;
}

export class WozService {
    private session: WozSession | null = null;
    private cache: Map<string, WozCacheEntry> = new Map();

    private readonly SESSION_DURATION = 5 * 60 * 1000; // 5 minuten
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 uur

    private readonly PDOK_BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';
    private readonly WOZ_BASE = 'https://www.wozwaardeloket.nl';

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

        // Stap 2: WOZ - Haal WOZ waarde op
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
     * WOZ-waardeloket: nummeraanduidingId -> WOZ waarde + peildatum
     */
    private async getWozWaarde(
        nummeraanduidingId: string
    ): Promise<{ waarde: number; peildatum: string; adres?: string }> {
        // Zorg dat we een geldige sessie hebben
        await this.ensureSession();

        if (!this.session) {
            throw new Error('WOZ service niet beschikbaar');
        }

        const url = `${this.WOZ_BASE}/wozwaardeloket-api/v1/wozwaarde/nummeraanduiding/${nummeraanduidingId}`;

        const response = await fetch(url, {
            headers: {
                Cookie: `awaf-sid=${this.session.awafSid}; session-id=${this.session.sessionId}; lb-sticky=${this.session.lbSticky}`,
                Accept: 'application/json',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Geen WOZ-waarde beschikbaar voor dit adres');
            }
            // Mogelijk sessie verlopen, reset en probeer opnieuw
            if (response.status === 401 || response.status === 403) {
                this.session = null;
                throw new Error('WOZ sessie verlopen, probeer opnieuw');
            }
            throw new Error(`WOZ API fout: ${response.status}`);
        }

        const data = (await response.json()) as WozWaardeResponse;

        if (!data.wozWaarden?.length) {
            throw new Error('Geen WOZ-waarde beschikbaar voor dit adres');
        }

        // Vind de meest recente WOZ waarde (hoogste peildatum)
        const sortedWaarden = [...data.wozWaarden].sort(
            (a, b) =>
                new Date(b.peildatum).getTime() - new Date(a.peildatum).getTime()
        );

        const recentste = sortedWaarden[0];

        return {
            waarde: recentste.vastgesteldeWaarde,
            peildatum: recentste.peildatum,
            adres: data.wozObject?.adres,
        };
    }

    /**
     * WOZ-waardeloket sessie management
     * Vereist 3-staps authenticatie:
     * 1. GET homepage -> awaf-sid cookie
     * 2. POST session/start -> session-id en lb-sticky
     */
    private async ensureSession(): Promise<void> {
        // Check of bestaande sessie nog geldig is
        if (this.session && this.isSessionValid()) {
            return;
        }

        // Stap 1: Haal awaf-sid cookie op van homepage
        const homepageResponse = await fetch(this.WOZ_BASE, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!homepageResponse.ok) {
            throw new Error('WOZ service niet beschikbaar');
        }

        // Extract awaf-sid cookie
        const cookies = homepageResponse.headers.get('set-cookie') || '';
        const awafSidMatch = cookies.match(/awaf-sid=([^;]+)/);
        const awafSid = awafSidMatch?.[1];

        if (!awafSid) {
            throw new Error('Kon WOZ sessie niet initialiseren (geen awaf-sid)');
        }

        // Stap 2: Start sessie
        const sessionResponse = await fetch(
            `${this.WOZ_BASE}/wozwaardeloket-api/v1/session/start`,
            {
                method: 'POST',
                headers: {
                    Cookie: `awaf-sid=${awafSid}`,
                    'Content-Type': 'application/json',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            }
        );

        if (!sessionResponse.ok) {
            throw new Error('Kon WOZ sessie niet starten');
        }

        // Extract session-id en lb-sticky cookies
        const sessionCookies = sessionResponse.headers.get('set-cookie') || '';
        const sessionIdMatch = sessionCookies.match(/session-id=([^;]+)/);
        const lbStickyMatch = sessionCookies.match(/lb-sticky=([^;]+)/);

        const sessionId = sessionIdMatch?.[1] || '';
        const lbSticky = lbStickyMatch?.[1] || '';

        this.session = {
            awafSid,
            sessionId,
            lbSticky,
            createdAt: Date.now(),
        };
    }

    /**
     * Check of sessie nog geldig is
     */
    private isSessionValid(): boolean {
        if (!this.session) return false;
        return Date.now() - this.session.createdAt < this.SESSION_DURATION;
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
        this.session = null;
    }
}

// Singleton instance
export const wozService = new WozService();
