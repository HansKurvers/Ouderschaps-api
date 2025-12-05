/**
 * TypeScript interfaces for Split-Online API integration
 * AFD (All Finance Datacatalogus) format
 */

// =============================================================================
// AFD Document Structure
// =============================================================================

export interface AfdDocument {
    Relatiedocument: {
        Relatiemantel: {
            AL: AfdAlgemeen;
            VP: AfdVerzekeringsnemer;
            SP: AfdSamenwonendPartner[];
            KN: AfdKind[];
        };
    };
}

// =============================================================================
// AL - Algemene Gegevens
// =============================================================================

export interface AfdAlgemeen {
    AL_COREF: string;      // Dossiernaam/nummer
    AL_CPREF: string;      // Externe referentie (ons dossier ID)
    AL_APPLNM: string;     // Naam verzendende applicatie
    AL_APPLVS: string;     // Versie applicatie
}

// =============================================================================
// VP - Verzekeringsnemer/Alimentatieplichtige (Partij 1)
// =============================================================================

export interface AfdVerzekeringsnemer {
    VP_ENTITEI: string;    // Altijd "VP"
    VP_VRWRKCD: string;    // Verwerkingscode (0 = Nieuw)
    VP_VOLGNUM: string;    // Volgnummer
    VP_GESLACH: string;    // "M" of "V"
    VP_ANAAM: string;      // Achternaam
    VP_VOORV: string;      // Voorvoegsels
    VP_VOORL: string;      // Voorletters (J.G.M.)
    VP_RNAAM: string;      // Roepnaam
    VP_EERSTVN: string;    // Eerste voornaam
    VP_TWEEVN: string;     // Tweede en volgende voornamen
    VP_GEBDAT: string;     // Geboortedatum (YYYYMMDD)
    VP_GEBPLTS: string;    // Geboorteplaats
    VP_STRAAT: string;     // Straatnaam
    VP_HUISNR: string;     // Huisnummer
    VP_TOEVOEG: string;    // Toevoeging
    VP_PLAATS: string;     // Woonplaats
    VP_PCODE: string;      // Postcode
    VP_TELNUM: string;     // Telefoonnummer
    VP_EMAIL: string;      // E-mailadres
}

// =============================================================================
// SP - Samenwonend Partner/Alimentatiegerechtigde (Partij 2)
// =============================================================================

export interface AfdSamenwonendPartner {
    SP_ENTITEI: string;    // Altijd "SP"
    SP_VRWRKCD: string;    // Verwerkingscode (0 = Nieuw)
    SP_VOLGNUM: string;    // Volgnummer
    SP_RELSRTC: string;    // Soort relatie ("AA" = Alimentatiegerechtigde)
    SP_GESLACH: string;    // "M" of "V"
    SP_ANAAM: string;      // Achternaam
    SP_VOORV: string;      // Voorvoegsels
    SP_VOORL: string;      // Voorletters
    SP_RNAAM: string;      // Roepnaam
    SP_EERSTVN: string;    // Eerste voornaam
    SP_TWEEVN: string;     // Tweede en volgende voornamen
    SP_GEBDAT: string;     // Geboortedatum (YYYYMMDD)
    SP_GEBPLTS: string;    // Geboorteplaats
    SP_STRAAT: string;     // Straatnaam
    SP_HUISNR: string;     // Huisnummer
    SP_TOEVOEG: string;    // Toevoeging
    SP_PLAATS: string;     // Woonplaats
    SP_PCODE: string;      // Postcode
    SP_TELNUM: string;     // Telefoonnummer
    SP_EMAIL: string;      // E-mailadres
}

// =============================================================================
// KN - Kind
// =============================================================================

export interface AfdKind {
    KN_ENTITEI: string;    // Altijd "KN"
    KN_VRWRKCD: string;    // Verwerkingscode (0 = Nieuw)
    KN_VOLGNUM: string;    // Volgnummer (1, 2, 3, ...)
    KN_RELTOT: string;     // Relatie tot ("VP" of "SP")
    KN_RELVNR: string;     // Relatie volgnummer
    KN_RELSRTC: string;    // Soort relatie ("C" = Kind)
    KN_ANAAM: string;      // Achternaam
    KN_VOORV: string;      // Voorvoegsels
    KN_VOORL: string;      // Voorletters/voornaam
    KN_GEBDAT: string;     // Geboortedatum (YYYYMMDD)
    KN_GEBPLTS: string;    // Geboorteplaats
}

// =============================================================================
// Split-Online API Types
// =============================================================================

export interface SplitOnlineExportResult {
    success: boolean;
    splitOnlineUrl?: string;
    splitOnlineDossierId?: string;
    message?: string;
    error?: string;
    details?: string;
    statusCode?: number;
}

export interface SplitOnlineApiResponse {
    success: boolean;
    url?: string;
    dossierId?: string;
    error?: string;
    details?: string;
    statusCode?: number;
}

// =============================================================================
// Internal Data Types
// =============================================================================

export interface DossierExportData {
    dossier: {
        id: number;
        dossierNummer: string;
    };
    partij1: PartijData | null;
    partij2: PartijData | null;
    kinderen: KindData[];
}

export interface PartijData {
    id: number;
    voornamen: string;
    roepnaam: string;
    tussenvoegsel: string;
    achternaam: string;
    geslacht: string;
    geboorteDatum: Date | string | null;
    geboorteplaats: string;
    adres: string;
    postcode: string;
    plaats: string;
    telefoon: string;
    email: string;
}

export interface KindData {
    id: number;
    voornamen: string;
    roepnaam: string;
    tussenvoegsel: string;
    achternaam: string;
    geslacht: string;
    geboorteDatum: Date | string | null;
    geboorteplaats: string;
}

// =============================================================================
// Helper Types
// =============================================================================

export interface ParsedAdres {
    straat: string;
    huisnummer: string;
    toevoeging: string;
}

export interface SplitVoornamen {
    eersteVoornaam: string;
    tweedeEnVolgende: string;
}
