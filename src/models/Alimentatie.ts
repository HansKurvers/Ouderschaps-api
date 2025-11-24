// Main alimentaties table
export interface Alimentatie {
    id: number;
    dossierId: number;
    nettoBesteedbaarGezinsinkomen: number | null;
    kostenKinderen: number | null;
    bijdrageKostenKinderenId: number | null;
    bijdrageTemplateId: number | null;
    // V2: Kinderrekening fields (applies to all children) - 7 velden
    stortingOuder1Kinderrekening?: number | null;
    stortingOuder2Kinderrekening?: number | null;
    kinderrekeningKostensoorten?: string[];  // JSON array of kostensoorten
    kinderrekeningMaximumOpname?: boolean | null;
    kinderrekeningMaximumOpnameBedrag?: number | null;
    kinderbijslagStortenOpKinderrekening?: boolean | null;
    kindgebondenBudgetStortenOpKinderrekening?: boolean | null;
    // V3: Alimentatie settings fields - 3 velden (for document generation)
    bedragenAlleKinderenGelijk?: boolean | null;
    alimentatiebedragPerKind?: number | null;
    zorgkortingPercentageAlleKinderen?: number | null;
    alimentatiegerechtigde?: string | null;
    // V4: Afspraken settings fields - 5 velden (arrangements equal for all children)
    afsprakenAlleKinderenGelijk?: boolean | null;
    hoofdverblijfAlleKinderen?: string | null;
    inschrijvingAlleKinderen?: string | null;
    kinderbijslagOntvangerAlleKinderen?: string | null;
    kindgebondenBudgetAlleKinderen?: string | null;
    // V5: Ingangsdatum fields - 3 velden
    ingangsdatumOptie?: string | null;
    ingangsdatum?: string | null;
    ingangsdatumAnders?: string | null;
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
    eigenAandeel?: number;
}

// Financiele afspraken kinderen
export interface FinancieleAfsprakenKinderen {
    id: number;
    alimentatieId: number;
    kindId: number;
    alimentatieBedrag?: number;
    hoofdverblijf?: string;  // NVARCHAR - personen name/identifier
    kinderbijslagOntvanger?: string;  // NVARCHAR - personen name/identifier
    zorgkortingPercentage?: number;  // INTEGER percentage
    inschrijving?: string;  // NVARCHAR - personen name/identifier
    kindgebondenBudget?: string;  // NVARCHAR - personen name/identifier
    // NOTE: kinderrekening fields are on Alimentatie level, not here
}

// DTOs for creating and updating
export interface CreateAlimentatieDto {
    nettoBesteedbaarGezinsinkomen?: number;
    kostenKinderen?: number;
    bijdrageTemplateId?: number;
    // V2: Kinderrekening fields
    stortingOuder1Kinderrekening?: number;
    stortingOuder2Kinderrekening?: number;
    kinderrekeningKostensoorten?: string[];
    kinderrekeningMaximumOpname?: boolean;
    kinderrekeningMaximumOpnameBedrag?: number;
    kinderbijslagStortenOpKinderrekening?: boolean;
    kindgebondenBudgetStortenOpKinderrekening?: boolean;
    // V3: Alimentatie settings fields
    bedragenAlleKinderenGelijk?: boolean;
    alimentatiebedragPerKind?: number;
    zorgkortingPercentageAlleKinderen?: number;
    alimentatiegerechtigde?: string;
    // V4: Afspraken settings fields
    afsprakenAlleKinderenGelijk?: boolean;
    hoofdverblijfAlleKinderen?: string;
    inschrijvingAlleKinderen?: string;
    kinderbijslagOntvangerAlleKinderen?: string;
    kindgebondenBudgetAlleKinderen?: string;
    // V5: Ingangsdatum fields
    ingangsdatumOptie?: string;
    ingangsdatum?: string;
    ingangsdatumAnders?: string;
}

export interface UpdateAlimentatieDto {
    nettoBesteedbaarGezinsinkomen?: number;
    kostenKinderen?: number;
    bijdrageTemplateId?: number;
    // V2: Kinderrekening fields
    stortingOuder1Kinderrekening?: number;
    stortingOuder2Kinderrekening?: number;
    kinderrekeningKostensoorten?: string[];
    kinderrekeningMaximumOpname?: boolean;
    kinderrekeningMaximumOpnameBedrag?: number;
    kinderbijslagStortenOpKinderrekening?: boolean;
    kindgebondenBudgetStortenOpKinderrekening?: boolean;
    // V3: Alimentatie settings fields
    bedragenAlleKinderenGelijk?: boolean;
    alimentatiebedragPerKind?: number;
    zorgkortingPercentageAlleKinderen?: number;
    alimentatiegerechtigde?: string;
    // V4: Afspraken settings fields
    afsprakenAlleKinderenGelijk?: boolean;
    hoofdverblijfAlleKinderen?: string;
    inschrijvingAlleKinderen?: string;
    kinderbijslagOntvangerAlleKinderen?: string;
    kindgebondenBudgetAlleKinderen?: string;
    // V5: Ingangsdatum fields
    ingangsdatumOptie?: string;
    ingangsdatum?: string;
    ingangsdatumAnders?: string;
}

export interface CreateBijdrageKostenKinderenDto {
    personenId: number;
    eigenAandeel?: number;
}

export interface CreateFinancieleAfsprakenKinderenDto {
    kindId: number;
    alimentatieBedrag?: number;
    hoofdverblijf?: string;
    kinderbijslagOntvanger?: string;
    zorgkortingPercentage?: number;
    inschrijving?: string;
    kindgebondenBudget?: string;
    // NOTE: kinderrekening fields moved to Alimentatie level in V2
}

export interface UpdateFinancieleAfsprakenKinderenDto {
    alimentatieBedrag?: number;
    hoofdverblijf?: string;
    kinderbijslagOntvanger?: string;
    zorgkortingPercentage?: number;
    inschrijving?: string;
    kindgebondenBudget?: string;
    // NOTE: kinderrekening fields moved to Alimentatie level in V2
}

// Complete data structure for API responses
export interface CompleteAlimentatieData {
    alimentatie: Alimentatie;
    bijdrageTemplate: BijdrageTemplate | null;
    bijdragenKostenKinderen: BijdrageKostenKinderen[];
    financieleAfsprakenKinderen: FinancieleAfsprakenKinderen[];
}