// Main alimentaties table
export interface Alimentatie {
    id: number;
    dossierId: number;
    nettoBesteedbaarGezinsinkomen: number | null;
    kostenKinderen: number | null;
    bijdrageKostenKinderenId: number | null;
    bijdrageTemplateId: number | null;
}

// Bijdrage templates
export interface BijdrageTemplate {
    id: number;
    omschrijving: string;
}

// Bijdragen kosten kinderen - linking table
export interface BijdrageKostenKinderen {
    id: number;
    alimentatieId: number;
    personenId: number;
}

// Financiele afspraken kinderen
export interface FinancieleAfsprakenKinderen {
    id: number;
    alimentatieId: number;
    kindId: number;
}

// DTOs for creating and updating
export interface CreateAlimentatieDto {
    nettoBesteedbaarGezinsinkomen?: number;
    kostenKinderen?: number;
    bijdrageTemplateId?: number;
}

export interface UpdateAlimentatieDto {
    nettoBesteedbaarGezinsinkomen?: number;
    kostenKinderen?: number;
    bijdrageTemplateId?: number;
}

export interface CreateBijdrageKostenKinderenDto {
    personenId: number;
}

export interface CreateFinancieleAfsprakenKinderenDto {
    kindId: number;
}

// Complete data structure for API responses
export interface CompleteAlimentatieData {
    alimentatie: Alimentatie;
    bijdrageTemplate: BijdrageTemplate | null;
    bijdragenKostenKinderen: BijdrageKostenKinderen[];
    financieleAfsprakenKinderen: FinancieleAfsprakenKinderen[];
}