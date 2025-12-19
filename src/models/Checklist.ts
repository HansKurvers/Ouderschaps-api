// =====================================================
// Document Checklist interfaces
// =====================================================

/**
 * Checklist template - herbruikbare sjabloon voor document checklists
 */
export interface ChecklistTemplate {
    id: number;
    naam: string;
    beschrijving: string | null;
    type: string; // 'echtscheiding', 'ouderschapsplan', 'mediation', etc.
    actief: boolean;
    isSysteemTemplate: boolean;
    volgorde: number;
    aantalItems?: number;
    aangemaaktOp: Date;
    gewijzigdOp: Date;
}

/**
 * Template item - standaard item binnen een template
 */
export interface ChecklistTemplateItem {
    id: number;
    templateId: number;
    naam: string;
    beschrijving: string | null;
    categorieId: number | null;
    categorieNaam?: string;
    toegewezenAanType: 'partij1' | 'partij2' | 'gezamenlijk';
    verplicht: boolean;
    volgorde: number;
    aangemaaktOp: Date;
}

/**
 * Dossier checklist - checklist gekoppeld aan een dossier
 */
export interface DossierChecklist {
    id: number;
    dossierId: number;
    naam: string;
    templateId: number | null;
    templateNaam?: string;
    aangemaaktDoorGebruikerId: number;
    aantalItems?: number;
    aantalAfgevinkt?: number;
    aantalVerplichtOpen?: number;
    aangemaaktOp: Date;
    gewijzigdOp: Date;
}

/**
 * Dossier checklist item - specifiek item in een dossier checklist
 */
export interface DossierChecklistItem {
    id: number;
    checklistId: number;
    naam: string;
    beschrijving: string | null;
    categorieId: number | null;
    categorieNaam?: string;
    categorieIcoon?: string;
    toegewezenAanType: 'partij1' | 'partij2' | 'gezamenlijk';
    toegewezenAanGastId: number | null;
    verplicht: boolean;
    volgorde: number;
    status: 'open' | 'afgevinkt' | 'nvt';
    documentId: number | null;
    documentNaam?: string;
    afgevinktOp: Date | null;
    afgevinktDoorGebruikerId: number | null;
    afgevinktDoorGastId: number | null;
    afgevinktDoor?: string; // Naam van de persoon die heeft afgevinkt
    notitie: string | null;
    aangemaaktOp: Date;
    gewijzigdOp: Date;
}

/**
 * Voortgang van een checklist
 */
export interface ChecklistProgress {
    totaal: number;
    afgevinkt: number;
    verplichtTotaal: number;
    verplichtAfgevinkt: number;
    percentage: number;
    perType: {
        partij1: { totaal: number; afgevinkt: number };
        partij2: { totaal: number; afgevinkt: number };
        gezamenlijk: { totaal: number; afgevinkt: number };
    };
}

/**
 * Complete checklist response met items en voortgang
 */
export interface ChecklistResponse {
    checklist: DossierChecklist | null;
    items: DossierChecklistItem[];
    progress: ChecklistProgress;
}

// =====================================================
// DTOs voor CRUD operaties
// =====================================================

export interface CreateChecklistFromTemplateDto {
    templateId: number;
}

export interface CreateChecklistItemDto {
    naam: string;
    beschrijving?: string;
    categorieId?: number;
    toegewezenAanType: 'partij1' | 'partij2' | 'gezamenlijk';
    verplicht?: boolean;
}

export interface UpdateChecklistItemDto {
    naam?: string;
    beschrijving?: string;
    categorieId?: number;
    toegewezenAanType?: 'partij1' | 'partij2' | 'gezamenlijk';
    verplicht?: boolean;
    status?: 'open' | 'afgevinkt' | 'nvt';
    documentId?: number | null;
    notitie?: string;
}

// =====================================================
// Database DTOs (snake_case om DB schema te matchen)
// =====================================================

export interface ChecklistTemplateDbDto {
    id: number;
    naam: string;
    beschrijving: string | null;
    type: string;
    actief: boolean;
    is_systeem_template: boolean;
    volgorde: number;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
    aantal_items?: number;
}

export interface ChecklistTemplateItemDbDto {
    id: number;
    template_id: number;
    naam: string;
    beschrijving: string | null;
    categorie_id: number | null;
    categorie_naam?: string;
    toegewezen_aan_type: string;
    verplicht: boolean;
    volgorde: number;
    aangemaakt_op: Date;
}

export interface DossierChecklistDbDto {
    id: number;
    dossier_id: number;
    naam: string;
    template_id: number | null;
    template_naam?: string;
    aangemaakt_door_gebruiker_id: number;
    aantal_items?: number;
    aantal_afgevinkt?: number;
    aantal_verplicht_open?: number;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
}

export interface DossierChecklistItemDbDto {
    id: number;
    checklist_id: number;
    naam: string;
    beschrijving: string | null;
    categorie_id: number | null;
    categorie_naam?: string;
    categorie_icoon?: string;
    toegewezen_aan_type: string;
    toegewezen_aan_gast_id: number | null;
    verplicht: boolean;
    volgorde: number;
    status: string;
    document_id: number | null;
    document_naam?: string;
    afgevinkt_op: Date | null;
    afgevinkt_door_gebruiker_id: number | null;
    afgevinkt_door_gast_id: number | null;
    afgevinkt_door?: string;
    notitie: string | null;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
}

// =====================================================
// Type aliases
// =====================================================

export type ToegewezenAanType = 'partij1' | 'partij2' | 'gezamenlijk';
export type ChecklistItemStatus = 'open' | 'afgevinkt' | 'nvt';
