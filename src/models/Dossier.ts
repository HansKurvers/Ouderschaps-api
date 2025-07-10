export interface Dossier {
    id: number;
    dossierNummer: string;
    gebruikerId: number;
    status: string;
    aangemaaktOp: Date;
    gewijzigdOp: Date;
}

export interface Gebruiker {
    id: number;
}

export interface Persoon {
    id: number;
    voorletters?: string;
    voornamen?: string;
    roepnaam?: string;
    geslacht?: string;
    tussenvoegsel?: string;
    achternaam: string;
    adres?: string;
    postcode?: string;
    plaats?: string;
    geboortePlaats?: string;
    geboorteDatum?: Date;
    nationaliteit1?: string;
    nationaliteit2?: string;
    telefoon?: string;
    email?: string;
    beroep?: string;
}

export interface KindOuder {
    id: number;
    kindId: number;
    ouderId: number;
    relatieTypeId: number;
}

export interface DossierKind {
    id: number;
    dossierId: number;
    kindId: number;
}

export interface DossierPartij {
    id: number;
    dossierId: number;
    rolId: number;
    persoonId: number;
}

export interface RelatieType {
    id: number;
    naam?: string;
}

export interface Rol {
    id: number;
    naam?: string;
}


export interface CompleteDossierData {
    dossier: Dossier;
    partijen: Array<{
        persoon: Persoon;
        rol: Rol;
    }>;
    kinderen: Array<{
        kind: Persoon;
        ouders: Array<{
            ouder: Persoon;
            relatieType: RelatieType;
        }>;
    }>;
}

// Type aliases for better readability
export type DossierId = number;
export type GebruikerId = number;
export type PersoonId = number;
export type RolId = number;
export type RelatieTypeId = number;

// Enums for common values
export enum DossierStatus {
    NIEUW = 'Nieuw',
    IN_BEHANDELING = 'In behandeling',
    AFGEROND = 'Afgerond',
    GEARCHIVEERD = 'Gearchiveerd',
}

export enum Geslacht {
    MAN = 'Man',
    VROUW = 'Vrouw',
    ANDERS = 'Anders',
    ONBEKEND = 'Onbekend',
}

// DTOs for database operations (using snake_case to match DB schema)
export interface DossierDbDto {
    id?: number;
    dossier_nummer: string;
    gebruiker_id: number;
    status: string;
    aangemaakt_op?: Date;
    gewijzigd_op?: Date;
}

export interface PersoonDbDto {
    id?: number;
    voorletters?: string;
    voornamen?: string;
    roepnaam?: string;
    geslacht?: string;
    tussenvoegsel?: string;
    achternaam: string;
    adres?: string;
    postcode?: string;
    plaats?: string;
    geboorte_plaats?: string;
    geboorte_datum?: Date;
    nationaliteit_1?: string;
    nationaliteit_2?: string;
    telefoon?: string;
    email?: string;
    beroep?: string;
}

// Utility types for creating/updating entities
export type CreateDossierDto = Omit<Dossier, 'id' | 'aangemaaktOp' | 'gewijzigdOp'>;
export type UpdateDossierDto = Partial<Omit<Dossier, 'id' | 'aangemaaktOp'>>;
export type CreatePersoonDto = Omit<Persoon, 'id'>;
export type UpdatePersoonDto = Partial<Omit<Persoon, 'id'>>;
