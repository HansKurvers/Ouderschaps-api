// =====================================================
// Berichten & Communicatie Types
// =====================================================

// =====================================================
// Database DTOs (snake_case - matching database columns)
// =====================================================

export interface BerichtTemplateDbDto {
    id: number;
    gebruiker_id: number | null;
    naam: string;
    onderwerp: string;
    inhoud: string;
    is_systeem_template: boolean;
    categorie: string | null;
    actief: boolean;
    volgorde: number;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
}

export interface DossierBerichtDbDto {
    id: number;
    dossier_id: number;
    onderwerp: string;
    inhoud: string;
    verzonden_door_gebruiker_id: number | null;
    verzonden_door_gast_id: number | null;
    is_urgent: boolean;
    is_vastgepind: boolean;
    email_notificatie_verzonden: boolean;
    email_verzonden_op: Date | null;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
    verwijderd_op: Date | null;
}

export interface BerichtBijlageDbDto {
    id: number;
    bericht_id: number;
    document_id: number;
    volgorde: number;
    aangemaakt_op: Date;
}

export interface BerichtGelezenDbDto {
    id: number;
    bericht_id: number;
    gelezen_door_gebruiker_id: number | null;
    gelezen_door_gast_id: number | null;
    gelezen_op: Date;
}

export interface BerichtReactieDbDto {
    id: number;
    bericht_id: number;
    inhoud: string;
    reactie_door_gebruiker_id: number | null;
    reactie_door_gast_id: number | null;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
    verwijderd_op: Date | null;
}

export interface BerichtEmailLogDbDto {
    id: number;
    bericht_id: number | null;
    reactie_id: number | null;
    verzonden_naar_email: string;
    verzonden_naar_naam: string | null;
    sendgrid_message_id: string | null;
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    error_message: string | null;
    aangemaakt_op: Date;
    verzonden_op: Date | null;
}

// =====================================================
// API Response Models (camelCase - for frontend)
// =====================================================

export interface BerichtTemplate {
    id: number;
    gebruikerId: number | null;
    naam: string;
    onderwerp: string;
    inhoud: string;
    isSysteemTemplate: boolean;
    categorie: string | null;
}

export interface AfzenderInfo {
    type: 'eigenaar' | 'gast';
    id: number;
    naam: string;
    email?: string;
}

export interface BerichtBijlage {
    id: number;
    documentId: number;
    documentNaam: string;
    documentGrootte: number;
    mimeType: string;
}

export interface BerichtGelezen {
    id: number;
    gelezenDoor: AfzenderInfo;
    gelezenOp: string;
}

export interface BerichtReactie {
    id: number;
    berichtId: number;
    inhoud: string;
    reactieDoor: AfzenderInfo;
    aangemaaaktOp: string;
}

export interface DossierBericht {
    id: number;
    dossierId: number;
    onderwerp: string;
    inhoud: string;
    isUrgent: boolean;
    isVastgepind: boolean;
    verzondendDoor: AfzenderInfo;
    bijlagen: BerichtBijlage[];
    gelezenDoor: BerichtGelezen[];
    reacties: BerichtReactie[];
    aantalReacties: number;
    aangemaaaktOp: string;
    gewijzigdOp: string;
}

export interface BerichtenOverzicht {
    berichten: DossierBericht[];
    ongelezen: number;
    totaal: number;
}

// =====================================================
// Request DTOs
// =====================================================

export interface CreateBerichtRequest {
    onderwerp: string;
    inhoud: string;
    isUrgent?: boolean;
    bijlagenDocumentIds?: number[];
}

export interface CreateReactieRequest {
    inhoud: string;
}

export interface CreateTemplateRequest {
    naam: string;
    onderwerp: string;
    inhoud: string;
    categorie?: string;
}
