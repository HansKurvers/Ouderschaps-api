import { BaseRepository } from './base/BaseRepository';
import {
    ChecklistTemplate,
    ChecklistTemplateItem,
    DossierChecklist,
    DossierChecklistItem,
    ChecklistProgress,
    ChecklistResponse,
    CreateChecklistItemDto,
    UpdateChecklistItemDto,
    ChecklistTemplateDbDto,
    ChecklistTemplateItemDbDto,
    DossierChecklistDbDto,
    DossierChecklistItemDbDto,
    ToegewezenAanType,
} from '../models/Checklist';

/**
 * Repository for Document Checklist operations
 *
 * Handles:
 * - Template retrieval
 * - Dossier checklist CRUD
 * - Checklist item CRUD
 * - Progress calculation
 */
export class ChecklistRepository extends BaseRepository {
    // ==========================================
    // MAPPERS
    // ==========================================

    private mapTemplate(dto: ChecklistTemplateDbDto): ChecklistTemplate {
        return {
            id: dto.id,
            naam: dto.naam,
            beschrijving: dto.beschrijving,
            type: dto.type,
            actief: dto.actief,
            isSysteemTemplate: dto.is_systeem_template,
            volgorde: dto.volgorde,
            aantalItems: dto.aantal_items,
            aangemaaktOp: dto.aangemaakt_op,
            gewijzigdOp: dto.gewijzigd_op,
        };
    }

    private mapTemplateItem(dto: ChecklistTemplateItemDbDto): ChecklistTemplateItem {
        return {
            id: dto.id,
            templateId: dto.template_id,
            naam: dto.naam,
            beschrijving: dto.beschrijving,
            categorieId: dto.categorie_id,
            categorieNaam: dto.categorie_naam,
            toegewezenAanType: dto.toegewezen_aan_type as ToegewezenAanType,
            verplicht: dto.verplicht,
            volgorde: dto.volgorde,
            aangemaaktOp: dto.aangemaakt_op,
        };
    }

    private mapDossierChecklist(dto: DossierChecklistDbDto): DossierChecklist {
        return {
            id: dto.id,
            dossierId: dto.dossier_id,
            naam: dto.naam,
            templateId: dto.template_id,
            templateNaam: dto.template_naam,
            aangemaaktDoorGebruikerId: dto.aangemaakt_door_gebruiker_id,
            aantalItems: dto.aantal_items,
            aantalAfgevinkt: dto.aantal_afgevinkt,
            aantalVerplichtOpen: dto.aantal_verplicht_open,
            aangemaaktOp: dto.aangemaakt_op,
            gewijzigdOp: dto.gewijzigd_op,
        };
    }

    private mapChecklistItem(dto: DossierChecklistItemDbDto): DossierChecklistItem {
        return {
            id: dto.id,
            checklistId: dto.checklist_id,
            naam: dto.naam,
            beschrijving: dto.beschrijving,
            categorieId: dto.categorie_id,
            categorieNaam: dto.categorie_naam,
            categorieIcoon: dto.categorie_icoon,
            toegewezenAanType: dto.toegewezen_aan_type as ToegewezenAanType,
            toegewezenAanGastId: dto.toegewezen_aan_gast_id,
            verplicht: dto.verplicht,
            volgorde: dto.volgorde,
            status: dto.status as 'open' | 'afgevinkt' | 'nvt',
            documentId: dto.document_id,
            documentNaam: dto.document_naam,
            afgevinktOp: dto.afgevinkt_op,
            afgevinktDoorGebruikerId: dto.afgevinkt_door_gebruiker_id,
            afgevinktDoorGastId: dto.afgevinkt_door_gast_id,
            afgevinktDoor: dto.afgevinkt_door,
            notitie: dto.notitie,
            aangemaaktOp: dto.aangemaakt_op,
            gewijzigdOp: dto.gewijzigd_op,
        };
    }

    // ==========================================
    // TEMPLATES
    // ==========================================

    /**
     * Gets all active templates, optionally filtered by type
     */
    async getTemplates(type?: string): Promise<ChecklistTemplate[]> {
        let query = `
            SELECT
                t.id,
                t.naam,
                t.beschrijving,
                t.type,
                t.actief,
                t.is_systeem_template,
                t.volgorde,
                COUNT(i.id) AS aantal_items,
                t.aangemaakt_op,
                t.gewijzigd_op
            FROM dbo.checklist_templates t
            LEFT JOIN dbo.checklist_template_items i ON t.id = i.template_id
            WHERE t.actief = 1
        `;

        const params: Record<string, unknown> = {};

        if (type) {
            query += ` AND t.type = @type`;
            params.type = type;
        }

        query += `
            GROUP BY t.id, t.naam, t.beschrijving, t.type, t.actief,
                     t.is_systeem_template, t.volgorde, t.aangemaakt_op, t.gewijzigd_op
            ORDER BY t.volgorde
        `;

        const results = await this.queryMany<ChecklistTemplateDbDto>(query, params);
        return results.map(dto => this.mapTemplate(dto));
    }

    /**
     * Gets items for a specific template
     */
    async getTemplateItems(templateId: number): Promise<ChecklistTemplateItem[]> {
        const query = `
            SELECT
                i.id,
                i.template_id,
                i.naam,
                i.beschrijving,
                i.categorie_id,
                c.naam AS categorie_naam,
                i.toegewezen_aan_type,
                i.verplicht,
                i.volgorde,
                i.aangemaakt_op
            FROM dbo.checklist_template_items i
            LEFT JOIN dbo.document_categorieen c ON i.categorie_id = c.id
            WHERE i.template_id = @templateId
            ORDER BY i.volgorde
        `;

        const results = await this.queryMany<ChecklistTemplateItemDbDto>(query, { templateId });
        return results.map(dto => this.mapTemplateItem(dto));
    }

    // ==========================================
    // DOSSIER CHECKLIST
    // ==========================================

    /**
     * Gets the checklist for a dossier
     */
    async getDossierChecklist(dossierId: number): Promise<DossierChecklist | null> {
        const query = `
            SELECT
                c.id,
                c.dossier_id,
                c.naam,
                c.template_id,
                t.naam AS template_naam,
                c.aangemaakt_door_gebruiker_id,
                COUNT(i.id) AS aantal_items,
                SUM(CASE WHEN i.status = 'afgevinkt' THEN 1 ELSE 0 END) AS aantal_afgevinkt,
                SUM(CASE WHEN i.verplicht = 1 AND i.status = 'open' THEN 1 ELSE 0 END) AS aantal_verplicht_open,
                c.aangemaakt_op,
                c.gewijzigd_op
            FROM dbo.dossier_checklists c
            LEFT JOIN dbo.checklist_templates t ON c.template_id = t.id
            LEFT JOIN dbo.dossier_checklist_items i ON c.id = i.checklist_id
            WHERE c.dossier_id = @dossierId
            GROUP BY c.id, c.dossier_id, c.naam, c.template_id, t.naam,
                     c.aangemaakt_door_gebruiker_id, c.aangemaakt_op, c.gewijzigd_op
        `;

        const result = await this.querySingle<DossierChecklistDbDto>(query, { dossierId });
        return result ? this.mapDossierChecklist(result) : null;
    }

    /**
     * Gets all items for a checklist
     */
    async getChecklistItems(checklistId: number): Promise<DossierChecklistItem[]> {
        const query = `
            SELECT
                i.id,
                i.checklist_id,
                i.naam,
                i.beschrijving,
                i.categorie_id,
                c.naam AS categorie_naam,
                c.icoon AS categorie_icoon,
                i.toegewezen_aan_type,
                i.toegewezen_aan_gast_id,
                i.verplicht,
                i.volgorde,
                i.status,
                i.document_id,
                d.originele_bestandsnaam AS document_naam,
                i.afgevinkt_op,
                i.afgevinkt_door_gebruiker_id,
                i.afgevinkt_door_gast_id,
                COALESCE(g.naam, ga.naam) AS afgevinkt_door,
                i.notitie,
                i.aangemaakt_op,
                i.gewijzigd_op
            FROM dbo.dossier_checklist_items i
            LEFT JOIN dbo.document_categorieen c ON i.categorie_id = c.id
            LEFT JOIN dbo.dossier_documenten d ON i.document_id = d.id
            LEFT JOIN dbo.gebruikers g ON i.afgevinkt_door_gebruiker_id = g.id
            LEFT JOIN dbo.dossier_gasten ga ON i.afgevinkt_door_gast_id = ga.id
            WHERE i.checklist_id = @checklistId
            ORDER BY i.toegewezen_aan_type, i.volgorde
        `;

        const results = await this.queryMany<DossierChecklistItemDbDto>(query, { checklistId });
        return results.map(dto => this.mapChecklistItem(dto));
    }

    /**
     * Calculates progress for a checklist
     */
    async getChecklistProgress(checklistId: number): Promise<ChecklistProgress> {
        const query = `
            SELECT
                toegewezen_aan_type AS type,
                COUNT(*) AS totaal,
                SUM(CASE WHEN status = 'afgevinkt' THEN 1 ELSE 0 END) AS afgevinkt,
                SUM(CASE WHEN verplicht = 1 THEN 1 ELSE 0 END) AS verplicht_totaal,
                SUM(CASE WHEN verplicht = 1 AND status = 'afgevinkt' THEN 1 ELSE 0 END) AS verplicht_afgevinkt
            FROM dbo.dossier_checklist_items
            WHERE checklist_id = @checklistId
            GROUP BY toegewezen_aan_type
        `;

        const results = await this.queryMany<{
            type: string;
            totaal: number;
            afgevinkt: number;
            verplicht_totaal: number;
            verplicht_afgevinkt: number;
        }>(query, { checklistId });

        const progress: ChecklistProgress = {
            totaal: 0,
            afgevinkt: 0,
            verplichtTotaal: 0,
            verplichtAfgevinkt: 0,
            percentage: 0,
            perType: {
                partij1: { totaal: 0, afgevinkt: 0 },
                partij2: { totaal: 0, afgevinkt: 0 },
                gezamenlijk: { totaal: 0, afgevinkt: 0 },
            },
        };

        for (const row of results) {
            progress.totaal += row.totaal;
            progress.afgevinkt += row.afgevinkt;
            progress.verplichtTotaal += row.verplicht_totaal;
            progress.verplichtAfgevinkt += row.verplicht_afgevinkt;

            if (row.type in progress.perType) {
                progress.perType[row.type as keyof typeof progress.perType] = {
                    totaal: row.totaal,
                    afgevinkt: row.afgevinkt,
                };
            }
        }

        progress.percentage =
            progress.totaal > 0 ? Math.round((progress.afgevinkt / progress.totaal) * 100) : 0;

        return progress;
    }

    /**
     * Gets complete checklist response with items and progress
     */
    async getCompleteChecklist(dossierId: number): Promise<ChecklistResponse> {
        const checklist = await this.getDossierChecklist(dossierId);

        if (!checklist) {
            return {
                checklist: null,
                items: [],
                progress: {
                    totaal: 0,
                    afgevinkt: 0,
                    verplichtTotaal: 0,
                    verplichtAfgevinkt: 0,
                    percentage: 0,
                    perType: {
                        partij1: { totaal: 0, afgevinkt: 0 },
                        partij2: { totaal: 0, afgevinkt: 0 },
                        gezamenlijk: { totaal: 0, afgevinkt: 0 },
                    },
                },
            };
        }

        const [items, progress] = await Promise.all([
            this.getChecklistItems(checklist.id),
            this.getChecklistProgress(checklist.id),
        ]);

        return { checklist, items, progress };
    }

    // ==========================================
    // CREATE / UPDATE / DELETE
    // ==========================================

    /**
     * Creates a new checklist from a template
     */
    async createChecklistFromTemplate(
        dossierId: number,
        templateId: number,
        userId: number
    ): Promise<DossierChecklist> {
        // Get template
        const templates = await this.getTemplates();
        const template = templates.find(t => t.id === templateId);

        if (!template) {
            throw new Error('Template niet gevonden');
        }

        // Check if checklist already exists
        const existing = await this.getDossierChecklist(dossierId);
        if (existing) {
            throw new Error(
                'Dit dossier heeft al een checklist. Verwijder eerst de bestaande checklist.'
            );
        }

        // Create checklist
        const createChecklistQuery = `
            INSERT INTO dbo.dossier_checklists (dossier_id, naam, template_id, aangemaakt_door_gebruiker_id)
            OUTPUT INSERTED.id
            VALUES (@dossierId, @naam, @templateId, @userId)
        `;

        const checklistResult = await this.querySingle<{ id: number }>(createChecklistQuery, {
            dossierId,
            naam: template.naam,
            templateId,
            userId,
        });

        if (!checklistResult) {
            throw new Error('Fout bij aanmaken checklist');
        }

        const checklistId = checklistResult.id;

        // Get template items and copy to dossier checklist
        const templateItems = await this.getTemplateItems(templateId);

        for (const item of templateItems) {
            await this.executeQuery(
                `
                INSERT INTO dbo.dossier_checklist_items (
                    checklist_id, naam, beschrijving, categorie_id,
                    toegewezen_aan_type, verplicht, volgorde
                )
                VALUES (
                    @checklistId, @naam, @beschrijving, @categorieId,
                    @toegewezenAanType, @verplicht, @volgorde
                )
            `,
                {
                    checklistId,
                    naam: item.naam,
                    beschrijving: item.beschrijving,
                    categorieId: item.categorieId,
                    toegewezenAanType: item.toegewezenAanType,
                    verplicht: item.verplicht,
                    volgorde: item.volgorde,
                }
            );
        }

        // Return the created checklist
        const result = await this.getDossierChecklist(dossierId);
        if (!result) {
            throw new Error('Fout bij ophalen aangemaakte checklist');
        }
        return result;
    }

    /**
     * Adds a new item to a checklist
     */
    async addChecklistItem(
        checklistId: number,
        data: CreateChecklistItemDto
    ): Promise<DossierChecklistItem> {
        // Get max volgorde
        const maxVolgordeResult = await this.querySingle<{ max: number }>(`
            SELECT ISNULL(MAX(volgorde), 0) + 1 AS max
            FROM dbo.dossier_checklist_items
            WHERE checklist_id = @checklistId
        `, { checklistId });

        const volgorde = maxVolgordeResult?.max ?? 1;

        const result = await this.querySingle<{ id: number }>(
            `
            INSERT INTO dbo.dossier_checklist_items (
                checklist_id, naam, beschrijving, categorie_id,
                toegewezen_aan_type, verplicht, volgorde
            )
            OUTPUT INSERTED.id
            VALUES (
                @checklistId, @naam, @beschrijving, @categorieId,
                @toegewezenAanType, @verplicht, @volgorde
            )
        `,
            {
                checklistId,
                naam: data.naam,
                beschrijving: data.beschrijving ?? null,
                categorieId: data.categorieId ?? null,
                toegewezenAanType: data.toegewezenAanType,
                verplicht: data.verplicht ?? true,
                volgorde,
            }
        );

        if (!result) {
            throw new Error('Fout bij toevoegen item');
        }

        // Get the created item with all details
        const itemQuery = `
            SELECT
                i.id,
                i.checklist_id,
                i.naam,
                i.beschrijving,
                i.categorie_id,
                c.naam AS categorie_naam,
                c.icoon AS categorie_icoon,
                i.toegewezen_aan_type,
                i.toegewezen_aan_gast_id,
                i.verplicht,
                i.volgorde,
                i.status,
                i.document_id,
                NULL AS document_naam,
                i.afgevinkt_op,
                i.afgevinkt_door_gebruiker_id,
                i.afgevinkt_door_gast_id,
                NULL AS afgevinkt_door,
                i.notitie,
                i.aangemaakt_op,
                i.gewijzigd_op
            FROM dbo.dossier_checklist_items i
            LEFT JOIN dbo.document_categorieen c ON i.categorie_id = c.id
            WHERE i.id = @itemId
        `;

        const item = await this.querySingle<DossierChecklistItemDbDto>(itemQuery, { itemId: result.id });
        if (!item) {
            throw new Error('Fout bij ophalen toegevoegd item');
        }
        return this.mapChecklistItem(item);
    }

    /**
     * Updates a checklist item
     */
    async updateChecklistItem(
        itemId: number,
        data: UpdateChecklistItemDto,
        userId?: number,
        gastId?: number
    ): Promise<void> {
        const updates: string[] = ['gewijzigd_op = GETDATE()'];
        const params: Record<string, unknown> = { itemId };

        if (data.naam !== undefined) {
            updates.push('naam = @naam');
            params.naam = data.naam;
        }
        if (data.beschrijving !== undefined) {
            updates.push('beschrijving = @beschrijving');
            params.beschrijving = data.beschrijving;
        }
        if (data.categorieId !== undefined) {
            updates.push('categorie_id = @categorieId');
            params.categorieId = data.categorieId;
        }
        if (data.toegewezenAanType !== undefined) {
            updates.push('toegewezen_aan_type = @toegewezenAanType');
            params.toegewezenAanType = data.toegewezenAanType;
        }
        if (data.verplicht !== undefined) {
            updates.push('verplicht = @verplicht');
            params.verplicht = data.verplicht;
        }
        if (data.status !== undefined) {
            updates.push('status = @status');
            params.status = data.status;

            if (data.status === 'afgevinkt') {
                updates.push('afgevinkt_op = GETDATE()');
                if (userId) {
                    updates.push('afgevinkt_door_gebruiker_id = @userId');
                    params.userId = userId;
                } else if (gastId) {
                    updates.push('afgevinkt_door_gast_id = @gastId');
                    params.gastId = gastId;
                }
            } else {
                // Reset when un-checking
                updates.push('afgevinkt_op = NULL');
                updates.push('afgevinkt_door_gebruiker_id = NULL');
                updates.push('afgevinkt_door_gast_id = NULL');
            }
        }
        if (data.documentId !== undefined) {
            updates.push('document_id = @documentId');
            params.documentId = data.documentId;
        }
        if (data.notitie !== undefined) {
            updates.push('notitie = @notitie');
            params.notitie = data.notitie;
        }

        await this.executeQuery(
            `
            UPDATE dbo.dossier_checklist_items
            SET ${updates.join(', ')}
            WHERE id = @itemId
        `,
            params
        );
    }

    /**
     * Deletes a checklist item
     */
    async deleteChecklistItem(itemId: number): Promise<void> {
        await this.executeQuery(
            `
            DELETE FROM dbo.dossier_checklist_items WHERE id = @itemId
        `,
            { itemId }
        );
    }

    /**
     * Deletes a checklist and all its items (CASCADE)
     */
    async deleteChecklist(checklistId: number): Promise<void> {
        await this.executeQuery(
            `
            DELETE FROM dbo.dossier_checklists WHERE id = @checklistId
        `,
            { checklistId }
        );
    }

    /**
     * Gets a checklist item by ID
     */
    async getChecklistItemById(itemId: number): Promise<DossierChecklistItem | null> {
        const query = `
            SELECT
                i.id,
                i.checklist_id,
                i.naam,
                i.beschrijving,
                i.categorie_id,
                c.naam AS categorie_naam,
                c.icoon AS categorie_icoon,
                i.toegewezen_aan_type,
                i.toegewezen_aan_gast_id,
                i.verplicht,
                i.volgorde,
                i.status,
                i.document_id,
                d.originele_bestandsnaam AS document_naam,
                i.afgevinkt_op,
                i.afgevinkt_door_gebruiker_id,
                i.afgevinkt_door_gast_id,
                COALESCE(g.naam, ga.naam) AS afgevinkt_door,
                i.notitie,
                i.aangemaakt_op,
                i.gewijzigd_op
            FROM dbo.dossier_checklist_items i
            LEFT JOIN dbo.document_categorieen c ON i.categorie_id = c.id
            LEFT JOIN dbo.dossier_documenten d ON i.document_id = d.id
            LEFT JOIN dbo.gebruikers g ON i.afgevinkt_door_gebruiker_id = g.id
            LEFT JOIN dbo.dossier_gasten ga ON i.afgevinkt_door_gast_id = ga.id
            WHERE i.id = @itemId
        `;

        const result = await this.querySingle<DossierChecklistItemDbDto>(query, { itemId });
        return result ? this.mapChecklistItem(result) : null;
    }

    /**
     * Gets the checklist ID for an item
     */
    async getChecklistIdForItem(itemId: number): Promise<number | null> {
        const result = await this.querySingle<{ checklist_id: number }>(
            `SELECT checklist_id FROM dbo.dossier_checklist_items WHERE id = @itemId`,
            { itemId }
        );
        return result?.checklist_id ?? null;
    }

    /**
     * Gets the dossier ID for a checklist
     */
    async getDossierIdForChecklist(checklistId: number): Promise<number | null> {
        const result = await this.querySingle<{ dossier_id: number }>(
            `SELECT dossier_id FROM dbo.dossier_checklists WHERE id = @checklistId`,
            { checklistId }
        );
        return result?.dossier_id ?? null;
    }
}
