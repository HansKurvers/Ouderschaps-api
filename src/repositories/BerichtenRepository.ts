import { BaseRepository } from './base/BaseRepository';
import {
    BerichtTemplate,
    BerichtTemplateDbDto,
    DossierBericht,
    BerichtBijlage,
    BerichtGelezen,
    BerichtReactie,
    BerichtenOverzicht,
    AfzenderInfo,
    CreateBerichtRequest,
    CreateTemplateRequest,
} from '../models/Berichten';

/**
 * Repository for Berichten & Communicatie operations
 *
 * Handles:
 * - Template retrieval and creation
 * - Dossier berichten CRUD
 * - Reacties CRUD
 * - Gelezen status management
 * - Bijlagen management
 */
export class BerichtenRepository extends BaseRepository {
    // ==========================================
    // MAPPERS
    // ==========================================

    private mapTemplate(dto: BerichtTemplateDbDto): BerichtTemplate {
        return {
            id: dto.id,
            gebruikerId: dto.gebruiker_id,
            naam: dto.naam,
            onderwerp: dto.onderwerp,
            inhoud: dto.inhoud,
            isSysteemTemplate: dto.is_systeem_template,
            categorie: dto.categorie,
        };
    }

    // ==========================================
    // TEMPLATES
    // ==========================================

    /**
     * Gets all active templates (system + user-specific)
     */
    async getTemplates(gebruikerId?: number): Promise<BerichtTemplate[]> {
        const query = `
            SELECT
                id,
                gebruiker_id,
                naam,
                onderwerp,
                inhoud,
                is_systeem_template,
                categorie,
                actief,
                volgorde,
                aangemaakt_op,
                gewijzigd_op
            FROM dbo.bericht_templates
            WHERE actief = 1
              AND (is_systeem_template = 1 OR gebruiker_id = @gebruikerId OR gebruiker_id IS NULL)
            ORDER BY volgorde
        `;

        const results = await this.queryMany<BerichtTemplateDbDto>(query, { gebruikerId });
        return results.map(dto => this.mapTemplate(dto));
    }

    /**
     * Creates a new user-specific template
     */
    async createTemplate(
        gebruikerId: number,
        data: CreateTemplateRequest
    ): Promise<BerichtTemplate> {
        const result = await this.querySingle<{ id: number }>(`
            INSERT INTO dbo.bericht_templates (gebruiker_id, naam, onderwerp, inhoud, categorie)
            OUTPUT INSERTED.id
            VALUES (@gebruikerId, @naam, @onderwerp, @inhoud, @categorie)
        `, {
            gebruikerId,
            naam: data.naam,
            onderwerp: data.onderwerp,
            inhoud: data.inhoud,
            categorie: data.categorie || null,
        });

        if (!result) {
            throw new Error('Fout bij aanmaken template');
        }

        const templates = await this.getTemplates(gebruikerId);
        const newTemplate = templates.find(t => t.id === result.id);
        if (!newTemplate) {
            throw new Error('Fout bij ophalen nieuwe template');
        }
        return newTemplate;
    }

    /**
     * Deletes a user-specific template (soft delete)
     */
    async deleteTemplate(templateId: number, gebruikerId: number): Promise<void> {
        await this.executeQuery(`
            UPDATE dbo.bericht_templates
            SET actief = 0
            WHERE id = @templateId
              AND gebruiker_id = @gebruikerId
              AND is_systeem_template = 0
        `, { templateId, gebruikerId });
    }

    // ==========================================
    // BERICHTEN
    // ==========================================

    /**
     * Gets all berichten for a dossier with full details
     */
    async getBerichten(
        dossierId: number,
        currentUserId?: number,
        currentGastId?: number
    ): Promise<BerichtenOverzicht> {
        // Haal berichten op
        const berichtenQuery = `
            SELECT
                b.id,
                b.dossier_id,
                b.onderwerp,
                b.inhoud,
                b.is_urgent,
                b.is_vastgepind,
                b.verzonden_door_gebruiker_id,
                b.verzonden_door_gast_id,
                g.naam AS verzonden_door_gebruiker_naam,
                ga.naam AS verzonden_door_gast_naam,
                ga.email AS verzonden_door_gast_email,
                b.aangemaakt_op,
                b.gewijzigd_op,
                (SELECT COUNT(*) FROM dbo.dossier_bericht_reacties r
                 WHERE r.bericht_id = b.id AND r.verwijderd_op IS NULL) AS aantal_reacties
            FROM dbo.dossier_berichten b
            LEFT JOIN dbo.gebruikers g ON b.verzonden_door_gebruiker_id = g.id
            LEFT JOIN dbo.dossier_gasten ga ON b.verzonden_door_gast_id = ga.id
            WHERE b.dossier_id = @dossierId
              AND b.verwijderd_op IS NULL
            ORDER BY b.is_vastgepind DESC, b.aangemaakt_op DESC
        `;

        const berichtenData = await this.queryMany<{
            id: number;
            dossier_id: number;
            onderwerp: string;
            inhoud: string;
            is_urgent: boolean;
            is_vastgepind: boolean;
            verzonden_door_gebruiker_id: number | null;
            verzonden_door_gast_id: number | null;
            verzonden_door_gebruiker_naam: string | null;
            verzonden_door_gast_naam: string | null;
            verzonden_door_gast_email: string | null;
            aangemaakt_op: Date;
            gewijzigd_op: Date;
            aantal_reacties: number;
        }>(berichtenQuery, { dossierId });

        const berichten: DossierBericht[] = [];

        for (const b of berichtenData) {
            // Haal bijlagen op
            const bijlagen = await this.getBijlagen(b.id);

            // Haal gelezen status op
            const gelezenDoor = await this.getGelezenDoor(b.id);

            // Haal reacties op
            const reacties = await this.getReacties(b.id);

            // Bepaal afzender
            const verzondendDoor: AfzenderInfo = b.verzonden_door_gebruiker_id
                ? {
                    type: 'eigenaar',
                    id: b.verzonden_door_gebruiker_id,
                    naam: b.verzonden_door_gebruiker_naam || 'Mediator',
                }
                : {
                    type: 'gast',
                    id: b.verzonden_door_gast_id!,
                    naam: b.verzonden_door_gast_naam || 'Gast',
                    email: b.verzonden_door_gast_email || undefined,
                };

            berichten.push({
                id: b.id,
                dossierId: b.dossier_id,
                onderwerp: b.onderwerp,
                inhoud: b.inhoud,
                isUrgent: b.is_urgent,
                isVastgepind: b.is_vastgepind,
                verzondendDoor,
                bijlagen,
                gelezenDoor,
                reacties,
                aantalReacties: b.aantal_reacties,
                aangemaaaktOp: b.aangemaakt_op.toISOString(),
                gewijzigdOp: b.gewijzigd_op.toISOString(),
            });
        }

        // Tel ongelezen berichten voor huidige gebruiker/gast
        let ongelezen = 0;
        for (const b of berichten) {
            const isGelezen = b.gelezenDoor.some(gl =>
                (currentUserId && gl.gelezenDoor.type === 'eigenaar' && gl.gelezenDoor.id === currentUserId) ||
                (currentGastId && gl.gelezenDoor.type === 'gast' && gl.gelezenDoor.id === currentGastId)
            );
            if (!isGelezen) ongelezen++;
        }

        return {
            berichten,
            ongelezen,
            totaal: berichten.length,
        };
    }

    /**
     * Gets bijlagen for a bericht
     */
    private async getBijlagen(berichtId: number): Promise<BerichtBijlage[]> {
        const query = `
            SELECT
                bb.id,
                bb.document_id,
                d.originele_bestandsnaam AS document_naam,
                d.bestandsgrootte AS document_grootte,
                d.mime_type
            FROM dbo.dossier_bericht_bijlagen bb
            INNER JOIN dbo.dossier_documenten d ON bb.document_id = d.id
            WHERE bb.bericht_id = @berichtId
            ORDER BY bb.volgorde
        `;

        const results = await this.queryMany<{
            id: number;
            document_id: number;
            document_naam: string;
            document_grootte: number;
            mime_type: string;
        }>(query, { berichtId });

        return results.map(r => ({
            id: r.id,
            documentId: r.document_id,
            documentNaam: r.document_naam,
            documentGrootte: r.document_grootte,
            mimeType: r.mime_type,
        }));
    }

    /**
     * Gets gelezen status for a bericht
     */
    private async getGelezenDoor(berichtId: number): Promise<BerichtGelezen[]> {
        const query = `
            SELECT
                gl.id,
                gl.gelezen_door_gebruiker_id,
                gl.gelezen_door_gast_id,
                g.naam AS gelezen_door_gebruiker_naam,
                ga.naam AS gelezen_door_gast_naam,
                gl.gelezen_op
            FROM dbo.dossier_bericht_gelezen gl
            LEFT JOIN dbo.gebruikers g ON gl.gelezen_door_gebruiker_id = g.id
            LEFT JOIN dbo.dossier_gasten ga ON gl.gelezen_door_gast_id = ga.id
            WHERE gl.bericht_id = @berichtId
        `;

        const results = await this.queryMany<{
            id: number;
            gelezen_door_gebruiker_id: number | null;
            gelezen_door_gast_id: number | null;
            gelezen_door_gebruiker_naam: string | null;
            gelezen_door_gast_naam: string | null;
            gelezen_op: Date;
        }>(query, { berichtId });

        return results.map(gl => ({
            id: gl.id,
            gelezenDoor: gl.gelezen_door_gebruiker_id
                ? {
                    type: 'eigenaar' as const,
                    id: gl.gelezen_door_gebruiker_id,
                    naam: gl.gelezen_door_gebruiker_naam || 'Mediator',
                }
                : {
                    type: 'gast' as const,
                    id: gl.gelezen_door_gast_id!,
                    naam: gl.gelezen_door_gast_naam || 'Gast',
                },
            gelezenOp: gl.gelezen_op.toISOString(),
        }));
    }

    /**
     * Gets reacties for a bericht
     */
    private async getReacties(berichtId: number): Promise<BerichtReactie[]> {
        const query = `
            SELECT
                r.id,
                r.bericht_id,
                r.inhoud,
                r.reactie_door_gebruiker_id,
                r.reactie_door_gast_id,
                g.naam AS reactie_door_gebruiker_naam,
                ga.naam AS reactie_door_gast_naam,
                r.aangemaakt_op
            FROM dbo.dossier_bericht_reacties r
            LEFT JOIN dbo.gebruikers g ON r.reactie_door_gebruiker_id = g.id
            LEFT JOIN dbo.dossier_gasten ga ON r.reactie_door_gast_id = ga.id
            WHERE r.bericht_id = @berichtId
              AND r.verwijderd_op IS NULL
            ORDER BY r.aangemaakt_op
        `;

        const results = await this.queryMany<{
            id: number;
            bericht_id: number;
            inhoud: string;
            reactie_door_gebruiker_id: number | null;
            reactie_door_gast_id: number | null;
            reactie_door_gebruiker_naam: string | null;
            reactie_door_gast_naam: string | null;
            aangemaakt_op: Date;
        }>(query, { berichtId });

        return results.map(r => ({
            id: r.id,
            berichtId: r.bericht_id,
            inhoud: r.inhoud,
            reactieDoor: r.reactie_door_gebruiker_id
                ? {
                    type: 'eigenaar' as const,
                    id: r.reactie_door_gebruiker_id,
                    naam: r.reactie_door_gebruiker_naam || 'Mediator',
                }
                : {
                    type: 'gast' as const,
                    id: r.reactie_door_gast_id!,
                    naam: r.reactie_door_gast_naam || 'Gast',
                },
            aangemaaaktOp: r.aangemaakt_op.toISOString(),
        }));
    }

    /**
     * Creates a new bericht
     */
    async createBericht(
        dossierId: number,
        data: CreateBerichtRequest,
        userId?: number,
        gastId?: number
    ): Promise<DossierBericht> {
        // Insert bericht
        const result = await this.querySingle<{ id: number }>(`
            INSERT INTO dbo.dossier_berichten (
                dossier_id, onderwerp, inhoud, is_urgent,
                verzonden_door_gebruiker_id, verzonden_door_gast_id
            )
            OUTPUT INSERTED.id
            VALUES (
                @dossierId, @onderwerp, @inhoud, @isUrgent,
                @userId, @gastId
            )
        `, {
            dossierId,
            onderwerp: data.onderwerp,
            inhoud: data.inhoud,
            isUrgent: data.isUrgent || false,
            userId: userId || null,
            gastId: gastId || null,
        });

        if (!result) {
            throw new Error('Fout bij aanmaken bericht');
        }

        const berichtId = result.id;

        // Voeg bijlagen toe
        if (data.bijlagenDocumentIds && data.bijlagenDocumentIds.length > 0) {
            for (let i = 0; i < data.bijlagenDocumentIds.length; i++) {
                await this.executeQuery(`
                    INSERT INTO dbo.dossier_bericht_bijlagen (bericht_id, document_id, volgorde)
                    VALUES (@berichtId, @documentId, @volgorde)
                `, {
                    berichtId,
                    documentId: data.bijlagenDocumentIds[i],
                    volgorde: i,
                });
            }
        }

        // Markeer als gelezen door afzender
        if (userId) {
            await this.markeerGelezen(berichtId, userId, undefined);
        } else if (gastId) {
            await this.markeerGelezen(berichtId, undefined, gastId);
        }

        // Return het nieuwe bericht
        const overzicht = await this.getBerichten(dossierId, userId, gastId);
        const bericht = overzicht.berichten.find(b => b.id === berichtId);
        if (!bericht) {
            throw new Error('Fout bij ophalen nieuw bericht');
        }
        return bericht;
    }

    /**
     * Deletes a bericht (soft delete)
     */
    async deleteBericht(berichtId: number): Promise<void> {
        await this.executeQuery(`
            UPDATE dbo.dossier_berichten
            SET verwijderd_op = GETDATE()
            WHERE id = @berichtId
        `, { berichtId });
    }

    /**
     * Toggles vastpinnen status
     */
    async toggleVastpinnen(berichtId: number): Promise<void> {
        await this.executeQuery(`
            UPDATE dbo.dossier_berichten
            SET is_vastgepind = CASE WHEN is_vastgepind = 1 THEN 0 ELSE 1 END,
                gewijzigd_op = GETDATE()
            WHERE id = @berichtId
        `, { berichtId });
    }

    /**
     * Gets bericht by ID (for checking ownership/access)
     */
    async getBerichtById(berichtId: number): Promise<{ dossierId: number } | null> {
        const result = await this.querySingle<{ dossier_id: number }>(`
            SELECT dossier_id FROM dbo.dossier_berichten WHERE id = @berichtId
        `, { berichtId });
        return result ? { dossierId: result.dossier_id } : null;
    }

    // ==========================================
    // REACTIES
    // ==========================================

    /**
     * Creates a new reactie
     */
    async createReactie(
        berichtId: number,
        inhoud: string,
        userId?: number,
        gastId?: number
    ): Promise<BerichtReactie> {
        const result = await this.querySingle<{ id: number }>(`
            INSERT INTO dbo.dossier_bericht_reacties (
                bericht_id, inhoud,
                reactie_door_gebruiker_id, reactie_door_gast_id
            )
            OUTPUT INSERTED.id
            VALUES (
                @berichtId, @inhoud,
                @userId, @gastId
            )
        `, {
            berichtId,
            inhoud,
            userId: userId || null,
            gastId: gastId || null,
        });

        if (!result) {
            throw new Error('Fout bij aanmaken reactie');
        }

        // Get naam van afzender
        let naam = 'Onbekend';
        if (userId) {
            const user = await this.querySingle<{ naam: string }>(`
                SELECT naam FROM dbo.gebruikers WHERE id = @userId
            `, { userId });
            naam = user?.naam || 'Mediator';
        } else if (gastId) {
            const gast = await this.querySingle<{ naam: string }>(`
                SELECT naam FROM dbo.dossier_gasten WHERE id = @gastId
            `, { gastId });
            naam = gast?.naam || 'Gast';
        }

        return {
            id: result.id,
            berichtId,
            inhoud,
            reactieDoor: {
                type: userId ? 'eigenaar' : 'gast',
                id: (userId || gastId)!,
                naam,
            },
            aangemaaaktOp: new Date().toISOString(),
        };
    }

    /**
     * Deletes a reactie (soft delete)
     */
    async deleteReactie(reactieId: number): Promise<void> {
        await this.executeQuery(`
            UPDATE dbo.dossier_bericht_reacties
            SET verwijderd_op = GETDATE()
            WHERE id = @reactieId
        `, { reactieId });
    }

    // ==========================================
    // GELEZEN STATUS
    // ==========================================

    /**
     * Marks a bericht as read
     */
    async markeerGelezen(
        berichtId: number,
        userId?: number,
        gastId?: number
    ): Promise<void> {
        // Check if already marked
        const existsQuery = userId
            ? `SELECT COUNT(*) AS count FROM dbo.dossier_bericht_gelezen
               WHERE bericht_id = @berichtId AND gelezen_door_gebruiker_id = @userId`
            : `SELECT COUNT(*) AS count FROM dbo.dossier_bericht_gelezen
               WHERE bericht_id = @berichtId AND gelezen_door_gast_id = @gastId`;

        const exists = await this.querySingle<{ count: number }>(existsQuery, {
            berichtId,
            userId,
            gastId,
        });

        if (exists && exists.count > 0) {
            return; // Already marked
        }

        // Insert
        await this.executeQuery(`
            INSERT INTO dbo.dossier_bericht_gelezen (bericht_id, gelezen_door_gebruiker_id, gelezen_door_gast_id)
            VALUES (@berichtId, @userId, @gastId)
        `, {
            berichtId,
            userId: userId || null,
            gastId: gastId || null,
        });
    }

    /**
     * Marks all berichten in a dossier as read
     */
    async markeerAlleGelezen(
        dossierId: number,
        userId?: number,
        gastId?: number
    ): Promise<void> {
        const berichten = await this.queryMany<{ id: number }>(`
            SELECT id FROM dbo.dossier_berichten
            WHERE dossier_id = @dossierId AND verwijderd_op IS NULL
        `, { dossierId });

        for (const b of berichten) {
            await this.markeerGelezen(b.id, userId, gastId);
        }
    }

    // ==========================================
    // EMAIL NOTIFICATIES
    // ==========================================

    /**
     * Gets all recipients for a bericht notification
     */
    async getNotificatieOntvangers(
        dossierId: number,
        afzenderUserId?: number,
        afzenderGastId?: number
    ): Promise<{ email: string; naam: string }[]> {
        const ontvangers: { email: string; naam: string }[] = [];

        // Eigenaar (als die niet de afzender is)
        if (!afzenderUserId) {
            const eigenaar = await this.querySingle<{ email: string; naam: string }>(`
                SELECT g.email, g.naam
                FROM dbo.dossiers d
                INNER JOIN dbo.gebruikers g ON d.gebruiker_id = g.id
                WHERE d.id = @dossierId
            `, { dossierId });

            if (eigenaar && eigenaar.email) {
                ontvangers.push(eigenaar);
            }
        }

        // Gasten (behalve afzender)
        const gasten = await this.queryMany<{ id: number; email: string; naam: string }>(`
            SELECT id, email, naam
            FROM dbo.dossier_gasten
            WHERE dossier_id = @dossierId
              AND ingetrokken = 0
              AND (@afzenderGastId IS NULL OR id != @afzenderGastId)
        `, { dossierId, afzenderGastId });

        for (const gast of gasten) {
            if (gast.email) {
                ontvangers.push({ email: gast.email, naam: gast.naam || gast.email });
            }
        }

        return ontvangers;
    }

    /**
     * Logs an email notification
     */
    async logEmailNotificatie(
        berichtId: number | null,
        reactieId: number | null,
        email: string,
        naam: string | null,
        status: 'pending' | 'sent' | 'delivered' | 'failed',
        errorMessage?: string
    ): Promise<void> {
        await this.executeQuery(`
            INSERT INTO dbo.bericht_email_log (
                bericht_id, reactie_id, verzonden_naar_email, verzonden_naar_naam,
                status, error_message, verzonden_op
            )
            VALUES (
                @berichtId, @reactieId, @email, @naam,
                @status, @errorMessage, CASE WHEN @status = 'sent' THEN GETDATE() ELSE NULL END
            )
        `, {
            berichtId,
            reactieId,
            email,
            naam,
            status,
            errorMessage: errorMessage || null,
        });
    }

    /**
     * Marks a bericht as having email notifications sent
     */
    async markeerEmailVerzonden(berichtId: number): Promise<void> {
        await this.executeQuery(`
            UPDATE dbo.dossier_berichten
            SET email_notificatie_verzonden = 1, email_verzonden_op = GETDATE()
            WHERE id = @berichtId
        `, { berichtId });
    }
}
