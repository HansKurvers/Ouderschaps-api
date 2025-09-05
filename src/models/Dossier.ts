export interface Dossier {
    id: number;
    dossierNummer: string;
    gebruikerId: number;
    status: boolean;
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
    geboorteplaats?: string;
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

// FASE 4: Omgang & Zorg interfaces

export interface Dag {
    id: number;
    naam: string;
}

export interface Schoolvakantie {
    id: number;
    naam: string;
}

export interface RegelingTemplate {
    id: number;
    templateNaam: string;
    templateTekst: string;
    meervoudKinderen: boolean;
    type: string;
}

export interface Dagdeel {
    id: number;
    naam: string;
}

export interface WeekRegeling {
    id: number;
    omschrijving: string;
}

export interface ZorgCategorie {
    id: number;
    naam: string;
}

export interface ZorgSituatie {
    id: number;
    naam: string;
    zorgCategorieId: number;
}

export interface Omgang {
    id: number;
    dag: Dag;
    dagdeel: Dagdeel;
    verzorger: Persoon;
    wisselTijd?: string;
    weekRegeling: WeekRegeling;
    weekRegelingAnders?: string;
    aangemaaktOp: Date;
    gewijzigdOp: Date;
}

export interface Zorg {
    id: number;
    zorgCategorie: ZorgCategorie;
    zorgSituatie: ZorgSituatie;
    situatieAnders?: string;
    overeenkomst: string;
    aangemaaktOp: Date;
    aangemaaktDoor: number;
    gewijzigdOp: Date;
    gewijzigdDoor?: number;
}

// DTOs for creating/updating
export interface CreateOmgangDto {
    dossierId: number;
    dagId: number;
    dagdeelId: number;
    verzorgerId: number;
    wisselTijd?: string;
    weekRegelingId: number;
    weekRegelingAnders?: string;
}

export interface UpdateOmgangDto {
    dagId?: number;
    dagdeelId?: number;
    verzorgerId?: number;
    wisselTijd?: string;
    weekRegelingId?: number;
    weekRegelingAnders?: string;
}

export interface CreateOmgangBatchDto {
    dossierId: number;
    entries: Array<{
        dagId: number;
        dagdeelId: number;
        verzorgerId: number;
        wisselTijd?: string;
        weekRegelingId: number;
        weekRegelingAnders?: string;
    }>;
}

export interface OmgangWeekDto {
    dossierId: number;
    weekRegelingId: number;
    days: Array<{
        dagId: number;
        wisselTijd?: string;
        dagdelen: Array<{
            dagdeelId: number;
            verzorgerId: number;
        }>;
    }>;
    weekRegelingAnders?: string;
}

export interface OmgangBatchResult {
    created: Omgang[];
    failed: Array<{
        entry: any;
        error: string;
    }>;
}

export interface CreateZorgDto {
    dossierId: number;
    zorgCategorieId: number;
    zorgSituatieId: number;
    situatieAnders?: string;
    overeenkomst: string;
}

export interface UpdateZorgDto {
    zorgCategorieId?: number;
    zorgSituatieId?: number;
    situatieAnders?: string;
    overeenkomst?: string;
}


export interface CompleteDossierData {
    dossier: Dossier;
    partijen: Array<{
        persoon: Persoon;
        rol: Rol;
    }>;
    kinderen: Array<{
        id: number;
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
    status: boolean;
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
    geboorteplaats?: string;
    geboorte_datum?: Date;
    nationaliteit_1?: string;
    nationaliteit_2?: string;
    telefoon?: string;
    email?: string;
    beroep?: string;
}

// Ouderschapsplan Info interfaces
export interface OuderschapsplanInfo {
    id: number;
    partij1PersoonId: number;
    partij2PersoonId: number;
    soortRelatie?: string;
    soortRelatieVerbreking?: string;
    betrokkenheidKind?: string;
    kiesplan?: string;
    gezagPartij?: 1 | 2;
    waOpNaamVanPartij?: 1 | 2;
    keuzeDevices?: string;
    zorgverzekeringOpNaamVanPartij?: 1 | 2;
    kinderbijslagPartij?: 1 | 2 | 3;
    brpPartij1?: number[];
    brpPartij2?: number[];
    kgbPartij1?: number[];
    kgbPartij2?: number[];
    hoofdverblijf?: string;
    zorgverdeling?: string;
    opvangKinderen?: string;
    bankrekeningnummersOpNaamVanKind?: string;
    parentingCoordinator?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface OuderschapsplanInfoDbDto {
    id?: number;
    partij_1_persoon_id: number;
    partij_2_persoon_id: number;
    soort_relatie?: string;
    soort_relatie_verbreking?: string;
    betrokkenheid_kind?: string;
    kiesplan?: string;
    gezag_partij?: number;
    wa_op_naam_van_partij?: number;
    keuze_devices?: string;
    zorgverzekering_op_naam_van_partij?: number;
    kinderbijslag_partij?: number;
    brp_partij_1?: string;
    brp_partij_2?: string;
    kgb_partij_1?: string;
    kgb_partij_2?: string;
    hoofdverblijf?: string;
    zorgverdeling?: string;
    opvang_kinderen?: string;
    bankrekeningnummers_op_naam_van_kind?: string;
    parenting_coordinator?: string;
    created_at?: Date;
    updated_at?: Date;
}

// Utility types for creating/updating entities
export type CreateDossierDto = Omit<Dossier, 'id' | 'aangemaaktOp' | 'gewijzigdOp'>;
export type UpdateDossierDto = Partial<Omit<Dossier, 'id' | 'aangemaaktOp'>>;
export type CreatePersoonDto = Omit<Persoon, 'id'>;
export type UpdatePersoonDto = Partial<Omit<Persoon, 'id'>>;
export type CreateOuderschapsplanInfoDto = Omit<OuderschapsplanInfo, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOuderschapsplanInfoDto = Partial<Omit<OuderschapsplanInfo, 'id' | 'createdAt' | 'updatedAt'>>;
