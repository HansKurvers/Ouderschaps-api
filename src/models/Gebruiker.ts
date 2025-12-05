/**
 * Gebruiker (User) Model
 * Represents a user in the Ouderschapsplan system
 */

export interface Gebruiker {
    id: number;
    auth0_id: string;
    email: string;
    naam: string;
    laatste_login?: Date;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
    has_active_subscription: boolean;

    // Mollie & Trial Tracking
    mollie_customer_id?: string;
    trial_used: boolean;
    eerste_subscription_datum?: Date;

    // Billing Profile Fields
    klant_type?: 'particulier' | 'zakelijk';
    telefoon?: string;

    // Address
    straat?: string;
    huisnummer?: string;
    postcode?: string;
    plaats?: string;
    land?: string; // Default: 'NL'

    // Business (only for klant_type = 'zakelijk')
    bedrijfsnaam?: string;
    btw_nummer?: string;
    kvk_nummer?: string;
    is_zakelijk?: boolean;

    // Profile completion tracking
    profiel_compleet: boolean;
    profiel_ingevuld_op?: Date;

    // External integrations
    splitonline_api_key?: string;
}

/**
 * DTO for updating user billing profile
 * Used for PUT /api/user/profile
 */
export interface UpdateBillingProfileDTO {
    naam?: string;
    klant_type: 'particulier' | 'zakelijk';
    telefoon?: string;

    // Address (required)
    straat: string;
    huisnummer: string;
    postcode: string;
    plaats: string;
    land?: string; // Default: 'NL'

    // Business (only for klant_type = 'zakelijk')
    bedrijfsnaam?: string;
    btw_nummer?: string;
    kvk_nummer?: string;

    // External integrations
    splitonline_api_key?: string;
}

/**
 * Response DTO for GET /api/user/profile
 */
export interface UserProfileResponse {
    id: number;
    email: string;
    naam: string;
    has_active_subscription: boolean;
    splitonline_api_key?: string | null;

    // Billing Profile
    billing_profile: {
        klant_type?: 'particulier' | 'zakelijk';
        telefoon?: string;

        // Address
        straat?: string;
        huisnummer?: string;
        postcode?: string;
        plaats?: string;
        land?: string;

        // Business
        bedrijfsnaam?: string;
        btw_nummer?: string;
        kvk_nummer?: string;

        // Status
        profiel_compleet: boolean;
        profiel_ingevuld_op?: Date;
    };
}
