// Omgangsregeling interface
export interface Omgangsregeling {
    id: number;
    dossierId: number;
    omgangTekstOfSchema?: string | null; // "tekst" | "schema" | "beide"
    omgangBeschrijving?: string | null; // Text description when tekst or beide is selected
    createdAt?: Date;
    updatedAt?: Date;
}

// DTO for creating new omgangsregeling
export interface CreateOmgangsregelingDto {
    dossierId: number;
    omgangTekstOfSchema?: string;
    omgangBeschrijving?: string;
}

// DTO for updating existing omgangsregeling
export interface UpdateOmgangsregelingDto {
    omgangTekstOfSchema?: string;
    omgangBeschrijving?: string;
}
