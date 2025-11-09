/**
 * Ouderschapsplan Text Generator
 *
 * Utility functions to generate readable text/sentences from ouderschapsplan_info fields
 * for use as placeholders in document generation (scheidingsdesk-document-generator).
 *
 * These functions convert database codes and separate fields into complete Dutch sentences
 * that can be inserted directly into legal documents.
 */

/**
 * Generate a readable sentence about parental authority (ouderlijk gezag)
 * based on gezag_partij and gezag_termijn_weken fields.
 *
 * @param gezagPartij - The parental authority code (1-5)
 * @param gezagTermijnWeken - Number of weeks to arrange joint custody (only for codes 4 & 5)
 * @param partij1Naam - Name of party 1 (optional, for personalization)
 * @param partij2Naam - Name of party 2 (optional, for personalization)
 * @returns A complete Dutch sentence describing the parental authority arrangement
 *
 * gezagPartij codes:
 * 1 = Gezamenlijk gezag (joint custody)
 * 2 = Partij 1 heeft alleen gezag (permanent)
 * 3 = Partij 2 heeft alleen gezag (permanent)
 * 4 = Partij 1 heeft alleen gezag (maar gezamenlijk gezag wordt nog geregeld)
 * 5 = Partij 2 heeft alleen gezag (maar gezamenlijk gezag wordt nog geregeld)
 */
export function generateGezagZin(
    gezagPartij?: 1 | 2 | 3 | 4 | 5,
    gezagTermijnWeken?: number,
    partij1Naam?: string,
    partij2Naam?: string
): string {
    if (!gezagPartij) {
        return 'Er is nog geen regeling getroffen over het ouderlijk gezag.';
    }

    const partij1 = partij1Naam || 'partij 1';
    const partij2 = partij2Naam || 'partij 2';

    switch (gezagPartij) {
        case 1:
            return `De ouders oefenen gezamenlijk het ouderlijk gezag uit over de minderjarige kinderen.`;

        case 2:
            return `${partij1} oefent alleen het ouderlijk gezag uit over de minderjarige kinderen.`;

        case 3:
            return `${partij2} oefent alleen het ouderlijk gezag uit over de minderjarige kinderen.`;

        case 4:
            if (gezagTermijnWeken && gezagTermijnWeken > 0) {
                return `${partij1} oefent voorlopig alleen het ouderlijk gezag uit over de minderjarige kinderen. De ouders zullen binnen ${gezagTermijnWeken} ${gezagTermijnWeken === 1 ? 'week' : 'weken'} een regeling treffen om het gezamenlijk ouderlijk gezag te regelen.`;
            }
            return `${partij1} oefent voorlopig alleen het ouderlijk gezag uit over de minderjarige kinderen. De ouders zullen een regeling treffen om het gezamenlijk ouderlijk gezag te regelen.`;

        case 5:
            if (gezagTermijnWeken && gezagTermijnWeken > 0) {
                return `${partij2} oefent voorlopig alleen het ouderlijk gezag uit over de minderjarige kinderen. De ouders zullen binnen ${gezagTermijnWeken} ${gezagTermijnWeken === 1 ? 'week' : 'weken'} een regeling treffen om het gezamenlijk ouderlijk gezag te regelen.`;
            }
            return `${partij2} oefent voorlopig alleen het ouderlijk gezag uit over de minderjarige kinderen. De ouders zullen een regeling treffen om het gezamenlijk ouderlijk gezag te regelen.`;

        default:
            return 'Er is nog geen regeling getroffen over het ouderlijk gezag.';
    }
}

/**
 * Generate a readable sentence about the start of the relationship
 * based on datum_aanvang_relatie, plaats_relatie, and soort_relatie fields.
 *
 * @param datumAanvangRelatie - Start date of the relationship
 * @param plaatsRelatie - Place where relationship started/was formalized
 * @param soortRelatie - Type of relationship (e.g., "Huwelijk", "Geregistreerd partnerschap", "Samenwonen")
 * @returns A complete Dutch sentence describing the relationship start
 */
export function generateRelatieAanvangZin(
    datumAanvangRelatie?: Date,
    plaatsRelatie?: string,
    soortRelatie?: string
): string {
    // If we have no data at all
    if (!datumAanvangRelatie && !plaatsRelatie && !soortRelatie) {
        return 'Er is geen informatie beschikbaar over de aanvang van de relatie.';
    }

    // Format the date in Dutch style (e.g., "15 januari 2020")
    const formattedDate = datumAanvangRelatie
        ? formatDutchDate(datumAanvangRelatie)
        : null;

    // Build the sentence based on available information
    const parts: string[] = [];

    // Determine the verb based on relationship type
    let verb = 'is aangevangen';
    if (soortRelatie) {
        const lowerType = soortRelatie.toLowerCase();
        if (lowerType.includes('huwelijk')) {
            verb = 'zijn gehuwd';
        } else if (lowerType.includes('geregistreerd partnerschap')) {
            verb = 'zijn een geregistreerd partnerschap aangegaan';
        } else if (lowerType.includes('samenwon')) {
            verb = 'zijn gaan samenwonen';
        }
    }

    // Start building the sentence
    if (soortRelatie) {
        parts.push(`De relatie (${soortRelatie.toLowerCase()})`);
    } else {
        parts.push('De relatie');
    }

    parts.push(verb);

    // Add date if available
    if (formattedDate) {
        parts.push(`op ${formattedDate}`);
    }

    // Add place if available
    if (plaatsRelatie) {
        parts.push(`te ${plaatsRelatie}`);
    }

    return parts.join(' ') + '.';
}

/**
 * Format a date in Dutch style
 *
 * @param date - Date to format
 * @returns Formatted date string (e.g., "15 januari 2020")
 */
function formatDutchDate(date: Date): string {
    const months = [
        'januari', 'februari', 'maart', 'april', 'mei', 'juni',
        'juli', 'augustus', 'september', 'oktober', 'november', 'december'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
}

/**
 * Generate ouderschapsplan goal/purpose sentence
 *
 * The sentence varies based on the relationship type:
 * - Marriage or registered partnership → "scheiden" (divorce)
 * - Cohabitation or other → "uit elkaar gaan" (break up)
 *
 * @param soortRelatie - Type of relationship (e.g., "Huwelijk", "Geregistreerd partnerschap", "Samenwonen")
 * @returns A complete Dutch sentence describing the purpose of the parenting plan
 */
export function generateOuderschapsplanDoelZin(soortRelatie?: string): string {
    // Determine if it's a formal relationship (marriage/partnership) or informal (cohabitation)
    let action = 'uit elkaar gaan';

    if (soortRelatie) {
        const lowerType = soortRelatie.toLowerCase();
        if (lowerType.includes('huwelijk') || lowerType.includes('geregistreerd partnerschap')) {
            action = 'scheiden';
        }
    }

    return `In dit ouderschapsplan hebben we afspraken gemaakt over onze kinderen omdat we gaan ${action}.`;
}

/**
 * Generate all placeholder texts for an OuderschapsplanInfo object
 *
 * This is a convenience function that generates all text placeholders at once.
 * The returned object can be merged with the original OuderschapsplanInfo for API responses.
 *
 * @param info - The OuderschapsplanInfo object
 * @param partij1Naam - Name of party 1 (optional)
 * @param partij2Naam - Name of party 2 (optional)
 * @returns An object containing all generated placeholder texts
 */
export interface OuderschapsplanPlaceholders {
    gezagZin: string;
    relatieAanvangZin: string;
    ouderschapsplanDoelZin: string;
}

export function generateAllPlaceholders(
    info: {
        gezagPartij?: 1 | 2 | 3 | 4 | 5;
        gezagTermijnWeken?: number;
        datumAanvangRelatie?: Date;
        plaatsRelatie?: string;
        soortRelatie?: string;
    },
    partij1Naam?: string,
    partij2Naam?: string
): OuderschapsplanPlaceholders {
    return {
        gezagZin: generateGezagZin(
            info.gezagPartij,
            info.gezagTermijnWeken,
            partij1Naam,
            partij2Naam
        ),
        relatieAanvangZin: generateRelatieAanvangZin(
            info.datumAanvangRelatie,
            info.plaatsRelatie,
            info.soortRelatie
        ),
        ouderschapsplanDoelZin: generateOuderschapsplanDoelZin(
            info.soortRelatie
        )
    };
}
