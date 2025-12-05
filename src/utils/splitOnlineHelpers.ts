/**
 * Helper functions for Split-Online data transformation
 */

import { ParsedAdres, SplitVoornamen } from '../types/splitOnline.types';

/**
 * Format a date to YYYYMMDD format for Split-Online
 * @param date - Date object, ISO string, or various date formats
 * @returns Formatted date string (YYYYMMDD) or empty string if invalid
 */
export function formatDateForSplitOnline(date: Date | string | null | undefined): string {
    if (!date) {
        return '';
    }

    try {
        let dateObj: Date;

        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            // Handle various date formats
            // ISO format: "1979-11-06" or "1979-11-06T00:00:00.000Z"
            // Dutch format: "06-11-1979"

            if (date.includes('T')) {
                // ISO format with time
                dateObj = new Date(date);
            } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // ISO date only: YYYY-MM-DD
                dateObj = new Date(date + 'T00:00:00');
            } else if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
                // Dutch format: DD-MM-YYYY
                const [day, month, year] = date.split('-');
                dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
                // Try parsing as-is
                dateObj = new Date(date);
            }
        } else {
            return '';
        }

        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
            return '';
        }

        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');

        return `${year}${month}${day}`;
    } catch {
        return '';
    }
}

/**
 * Extract initials from full first names
 * @param voornamen - Full first names (e.g., "Jan Gerrit Marinus")
 * @returns Initials with dots (e.g., "J.G.M.")
 */
export function extractInitials(voornamen: string | null | undefined): string {
    if (!voornamen || voornamen.trim() === '') {
        return '';
    }

    const names = voornamen.trim().split(/\s+/);
    const initials = names
        .filter(name => name.length > 0)
        .map(name => name.charAt(0).toUpperCase() + '.')
        .join('');

    return initials;
}

/**
 * Split first names into first and remaining names
 * @param voornamen - Full first names (e.g., "Jan Gerrit Marinus")
 * @returns Object with first name and remaining names
 */
export function splitVoornamen(voornamen: string | null | undefined): SplitVoornamen {
    if (!voornamen || voornamen.trim() === '') {
        return { eersteVoornaam: '', tweedeEnVolgende: '' };
    }

    const names = voornamen.trim().split(/\s+/);

    if (names.length === 0) {
        return { eersteVoornaam: '', tweedeEnVolgende: '' };
    }

    const eersteVoornaam = names[0] || '';
    const tweedeEnVolgende = names.slice(1).join(' ');

    return { eersteVoornaam, tweedeEnVolgende };
}

/**
 * Parse a Dutch address into street, house number, and addition
 * @param adres - Full address (e.g., "Huisweg 10" or "Kerkstraat 5a" or "Van der Bergweg 123-B")
 * @returns Parsed address components
 */
export function parseAdres(adres: string | null | undefined): ParsedAdres {
    if (!adres || adres.trim() === '') {
        return { straat: '', huisnummer: '', toevoeging: '' };
    }

    const trimmedAdres = adres.trim();

    // Regex to match: street name, house number, optional addition
    // Handles cases like:
    // - "Huisweg 10"
    // - "Kerkstraat 5a"
    // - "Kerkstraat 5 a"
    // - "Van der Bergweg 123-B"
    // - "Lange Voorhout 12 II"
    // - "Prinsengracht 263-265"

    // Pattern: everything before the last number sequence is the street
    // The number sequence is the house number
    // Everything after the number is the addition

    const match = trimmedAdres.match(/^(.+?)\s+(\d+[\d-]*)\s*(.*)$/);

    if (match) {
        const straat = match[1].trim();
        const huisnummer = match[2].trim();
        const toevoeging = match[3].trim();

        return { straat, huisnummer, toevoeging };
    }

    // If no match, return the whole thing as street
    return { straat: trimmedAdres, huisnummer: '', toevoeging: '' };
}

/**
 * Map gender value to Split-Online format
 * @param geslacht - Gender from database (various formats)
 * @returns "M" or "V" or empty string
 */
export function mapGeslacht(geslacht: string | null | undefined): string {
    if (!geslacht) {
        return '';
    }

    const normalized = geslacht.toLowerCase().trim();

    if (normalized === 'm' || normalized === 'man' || normalized === 'male') {
        return 'M';
    }

    if (normalized === 'v' || normalized === 'vrouw' || normalized === 'female') {
        return 'V';
    }

    return '';
}

/**
 * Format postcode to standard Dutch format (remove spaces)
 * @param postcode - Postcode (e.g., "1234 AB" or "1234AB")
 * @returns Formatted postcode without spaces
 */
export function formatPostcode(postcode: string | null | undefined): string {
    if (!postcode) {
        return '';
    }

    // Remove all spaces and convert to uppercase
    return postcode.replace(/\s+/g, '').toUpperCase();
}

/**
 * Ensure a value is a string (convert null/undefined to empty string)
 * Split-Online expects empty strings, not null values
 * @param value - Any value
 * @returns String value or empty string
 */
export function toSafeString(value: string | null | undefined): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}
