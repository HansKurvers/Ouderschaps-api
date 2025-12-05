/**
 * AFD (All Finance Datacatalogus) Mapper
 * Maps dossier data to Split-Online AFD format
 */

import {
    AfdDocument,
    AfdAlgemeen,
    AfdVerzekeringsnemer,
    AfdSamenwonendPartner,
    AfdKind,
    DossierExportData,
    PartijData,
    KindData,
} from '../types/splitOnline.types';

import {
    formatDateForSplitOnline,
    extractInitials,
    splitVoornamen,
    parseAdres,
    mapGeslacht,
    formatPostcode,
    toSafeString,
} from '../utils/splitOnlineHelpers';

// Application constants
const APP_NAME = 'i-docx';
const APP_VERSION = '1.0.0';

/**
 * Map complete dossier data to AFD document format
 */
export function mapToAfdDocument(data: DossierExportData): AfdDocument {
    return {
        Relatiedocument: {
            Relatiemantel: {
                AL: mapAlgemeen(data),
                VP: mapVerzekeringsnemer(data.partij1),
                SP: [mapSamenwonendPartner(data.partij2)],
                KN: mapKinderen(data.kinderen),
            },
        },
    };
}

/**
 * Map AL - Algemene gegevens
 */
function mapAlgemeen(data: DossierExportData): AfdAlgemeen {
    return {
        AL_COREF: toSafeString(data.dossier.dossierNummer),
        AL_CPREF: String(data.dossier.id),
        AL_APPLNM: APP_NAME,
        AL_APPLVS: APP_VERSION,
    };
}

/**
 * Map VP - Verzekeringsnemer/Alimentatieplichtige (Partij 1)
 */
function mapVerzekeringsnemer(partij: PartijData | null): AfdVerzekeringsnemer {
    if (!partij) {
        // Return empty VP structure if no partij 1
        return createEmptyVP();
    }

    const voornamen = splitVoornamen(partij.voornamen);
    const adres = parseAdres(partij.adres);

    return {
        VP_ENTITEI: 'VP',
        VP_VRWRKCD: '0',
        VP_VOLGNUM: '1',
        VP_GESLACH: mapGeslacht(partij.geslacht),
        VP_ANAAM: toSafeString(partij.achternaam),
        VP_VOORV: toSafeString(partij.tussenvoegsel),
        VP_VOORL: extractInitials(partij.voornamen),
        VP_RNAAM: toSafeString(partij.roepnaam),
        VP_EERSTVN: voornamen.eersteVoornaam,
        VP_TWEEVN: voornamen.tweedeEnVolgende,
        VP_GEBDAT: formatDateForSplitOnline(partij.geboorteDatum),
        VP_GEBPLTS: toSafeString(partij.geboorteplaats),
        VP_STRAAT: adres.straat,
        VP_HUISNR: adres.huisnummer,
        VP_TOEVOEG: adres.toevoeging,
        VP_PLAATS: toSafeString(partij.plaats),
        VP_PCODE: formatPostcode(partij.postcode),
        VP_TELNUM: toSafeString(partij.telefoon),
        VP_EMAIL: toSafeString(partij.email),
    };
}

/**
 * Map SP - Samenwonend Partner/Alimentatiegerechtigde (Partij 2)
 */
function mapSamenwonendPartner(partij: PartijData | null): AfdSamenwonendPartner {
    if (!partij) {
        // Return empty SP structure if no partij 2
        return createEmptySP();
    }

    const voornamen = splitVoornamen(partij.voornamen);
    const adres = parseAdres(partij.adres);

    return {
        SP_ENTITEI: 'SP',
        SP_VRWRKCD: '0',
        SP_VOLGNUM: '1',
        SP_RELSRTC: 'AA', // AA = Alimentatiegerechtigde
        SP_GESLACH: mapGeslacht(partij.geslacht),
        SP_ANAAM: toSafeString(partij.achternaam),
        SP_VOORV: toSafeString(partij.tussenvoegsel),
        SP_VOORL: extractInitials(partij.voornamen),
        SP_RNAAM: toSafeString(partij.roepnaam),
        SP_EERSTVN: voornamen.eersteVoornaam,
        SP_TWEEVN: voornamen.tweedeEnVolgende,
        SP_GEBDAT: formatDateForSplitOnline(partij.geboorteDatum),
        SP_GEBPLTS: toSafeString(partij.geboorteplaats),
        SP_STRAAT: adres.straat,
        SP_HUISNR: adres.huisnummer,
        SP_TOEVOEG: adres.toevoeging,
        SP_PLAATS: toSafeString(partij.plaats),
        SP_PCODE: formatPostcode(partij.postcode),
        SP_TELNUM: toSafeString(partij.telefoon),
        SP_EMAIL: toSafeString(partij.email),
    };
}

/**
 * Map KN - Kinderen
 * Each child needs two entries: one for relation to VP, one for relation to SP
 */
function mapKinderen(kinderen: KindData[]): AfdKind[] {
    const result: AfdKind[] = [];

    kinderen.forEach((kind, index) => {
        const volgnummer = String(index + 1);

        // Create entry for relation to VP (Partij 1)
        result.push(mapKind(kind, volgnummer, 'VP'));

        // Create entry for relation to SP (Partij 2)
        result.push(mapKind(kind, volgnummer, 'SP'));
    });

    return result;
}

/**
 * Map single child entry
 */
function mapKind(kind: KindData, volgnummer: string, relatieTot: 'VP' | 'SP'): AfdKind {
    return {
        KN_ENTITEI: 'KN',
        KN_VRWRKCD: '0',
        KN_VOLGNUM: volgnummer,
        KN_RELTOT: relatieTot,
        KN_RELVNR: '1',
        KN_RELSRTC: 'C', // C = Kind
        KN_ANAAM: toSafeString(kind.achternaam),
        KN_VOORV: toSafeString(kind.tussenvoegsel),
        KN_VOORL: toSafeString(kind.voornamen) || toSafeString(kind.roepnaam),
        KN_GEBDAT: formatDateForSplitOnline(kind.geboorteDatum),
        KN_GEBPLTS: toSafeString(kind.geboorteplaats),
    };
}

/**
 * Create empty VP structure for missing partij 1
 */
function createEmptyVP(): AfdVerzekeringsnemer {
    return {
        VP_ENTITEI: 'VP',
        VP_VRWRKCD: '0',
        VP_VOLGNUM: '1',
        VP_GESLACH: '',
        VP_ANAAM: '',
        VP_VOORV: '',
        VP_VOORL: '',
        VP_RNAAM: '',
        VP_EERSTVN: '',
        VP_TWEEVN: '',
        VP_GEBDAT: '',
        VP_GEBPLTS: '',
        VP_STRAAT: '',
        VP_HUISNR: '',
        VP_TOEVOEG: '',
        VP_PLAATS: '',
        VP_PCODE: '',
        VP_TELNUM: '',
        VP_EMAIL: '',
    };
}

/**
 * Create empty SP structure for missing partij 2
 */
function createEmptySP(): AfdSamenwonendPartner {
    return {
        SP_ENTITEI: 'SP',
        SP_VRWRKCD: '0',
        SP_VOLGNUM: '1',
        SP_RELSRTC: 'AA',
        SP_GESLACH: '',
        SP_ANAAM: '',
        SP_VOORV: '',
        SP_VOORL: '',
        SP_RNAAM: '',
        SP_EERSTVN: '',
        SP_TWEEVN: '',
        SP_GEBDAT: '',
        SP_GEBPLTS: '',
        SP_STRAAT: '',
        SP_HUISNR: '',
        SP_TOEVOEG: '',
        SP_PLAATS: '',
        SP_PCODE: '',
        SP_TELNUM: '',
        SP_EMAIL: '',
    };
}
