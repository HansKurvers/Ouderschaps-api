export interface IDossier {
    id: number;
    dossierNummer: string;
    gebruikerId: number;
    status: string;
    aangemaaktOp: Date;
    gewijzigdOp: Date;
}

export interface IGebruiker {
    id: number;
}

export interface IPersoon {
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

export interface IKindOuder {
    id: number;
    kindId: number;
    ouderId: number;
    relatieTypeId: number;
}

export interface IDossierKind {
    id: number;
    dossierId: number;
    kindId: number;
}

export interface IDossierPartij {
    id: number;
    dossierId: number;
    rolId: number;
    persoonId: number;
}

export interface IRelatieType {
    id: number;
    naam?: string;
}

export interface IRol {
    id: number;
    naam?: string;
}

export interface IOuderschapsplanGegevens {
    id: number;
    dossierId: number;
    veldCode: string;
    veldNaam: string;
    veldWaarde?: string;
    aangemaaktOp?: Date;
    gewijzigdOp?: Date;
}

export interface ICompleteDossierData {
    dossier: IDossier;
    partijen: Array<{
        persoon: IPersoon;
        rol: IRol;
    }>;
    kinderen: Array<{
        kind: IPersoon;
        ouders: Array<{
            ouder: IPersoon;
            relatieType: IRelatieType;
        }>;
    }>;
    ouderschapsplanGegevens: IOuderschapsplanGegevens[];
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
    GEARCHIVEERD = 'Gearchiveerd'
}

export enum Geslacht {
    MAN = 'Man',
    VROUW = 'Vrouw',
    ANDERS = 'Anders',
    ONBEKEND = 'Onbekend'
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
export type CreateDossierDto = Omit<IDossier, 'id' | 'aangemaaktOp' | 'gewijzigdOp'>;
export type UpdateDossierDto = Partial<Omit<IDossier, 'id' | 'aangemaaktOp'>>;
export type CreatePersoonDto = Omit<IPersoon, 'id'>;
export type UpdatePersoonDto = Partial<Omit<IPersoon, 'id'>>;