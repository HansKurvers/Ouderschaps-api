// Communicatie Afspraken interface
export interface CommunicatieAfspraken {
    id: number;
    dossierId: number;
    villaPinedo?: boolean | null;
    kiesMethode?: string | null;
    omgangTekstOfSchema?: string | null;
    opvang?: string | null;
    informatieUitwisseling?: string | null;
    bijlageBeslissingen?: string | null;
    socialMedia?: string | null;
    mobielTablet?: string | null;
    idBewijzen?: string | null;
    aansprakelijkheidsverzekering?: string | null;
    ziektekostenverzekering?: string | null;
    toestemmingReizen?: string | null;
    jongmeerderjarige?: string | null;
    studiekosten?: string | null;
    bankrekeningKinderen?: string | null;
    evaluatie?: string | null;
    parentingCoordinator?: string | null;
    mediationClausule?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// DTO for creating new communicatie afspraken
export interface CreateCommunicatieAfsprakenDto {
    dossierId: number;
    villaPinedo?: boolean;
    kiesMethode?: string;
    omgangTekstOfSchema?: string;
    opvang?: string;
    informatieUitwisseling?: string;
    bijlageBeslissingen?: string;
    socialMedia?: string;
    mobielTablet?: string;
    idBewijzen?: string;
    aansprakelijkheidsverzekering?: string;
    ziektekostenverzekering?: string;
    toestemmingReizen?: string;
    jongmeerderjarige?: string;
    studiekosten?: string;
    bankrekeningKinderen?: string;
    evaluatie?: string;
    parentingCoordinator?: string;
    mediationClausule?: string;
}

// DTO for updating existing communicatie afspraken
export interface UpdateCommunicatieAfsprakenDto {
    villaPinedo?: boolean;
    kiesMethode?: string;
    omgangTekstOfSchema?: string;
    opvang?: string;
    informatieUitwisseling?: string;
    bijlageBeslissingen?: string;
    socialMedia?: string;
    mobielTablet?: string;
    idBewijzen?: string;
    aansprakelijkheidsverzekering?: string;
    ziektekostenverzekering?: string;
    toestemmingReizen?: string;
    jongmeerderjarige?: string;
    studiekosten?: string;
    bankrekeningKinderen?: string;
    evaluatie?: string;
    parentingCoordinator?: string;
    mediationClausule?: string;
}
