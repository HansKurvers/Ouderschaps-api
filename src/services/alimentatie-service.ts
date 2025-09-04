import sql from 'mssql';
import { getPool } from '../config/database';
import {
    Alimentatie,
    BijdrageTemplate,
    BijdrageKostenKinderen,
    FinancieleAfsprakenKinderen,
    CompleteAlimentatieData,
    CreateAlimentatieDto,
    UpdateAlimentatieDto,
    CreateBijdrageKostenKinderenDto,
    CreateFinancieleAfsprakenKinderenDto
} from '../models/Alimentatie';

export class AlimentatieService {
    private async getPool(): Promise<sql.ConnectionPool> {
        return await getPool();
    }

    // Get alimentatie by dossier ID
    async getAlimentatieByDossierId(dossierId: number): Promise<CompleteAlimentatieData | null> {
        try {
            const pool = await this.getPool();
            
            // Get main alimentatie record
            const alimentatieResult = await pool.request()
                .input('DossierId', sql.Int, dossierId)
                .query(`
                    SELECT 
                        id,
                        dossier_id as dossierId,
                        netto_besteedbaar_gezinsinkomen as nettoBesteedbaarGezinsinkomen,
                        kosten_kinderen as kostenKinderen,
                        bijdrage_kosten_kinderen as bijdrageKostenKinderenId,
                        bijdrage_template as bijdrageTemplateId
                    FROM dbo.alimentaties 
                    WHERE dossier_id = @DossierId
                `);

            if (!alimentatieResult.recordset[0]) {
                return null;
            }

            const alimentatie = alimentatieResult.recordset[0];

            // Get bijdrage template if exists
            let bijdrageTemplate = null;
            if (alimentatie.bijdrageTemplateId) {
                const templateResult = await pool.request()
                    .input('TemplateId', sql.Int, alimentatie.bijdrageTemplateId)
                    .query(`
                        SELECT id, omschrijving
                        FROM dbo.bijdrage_templates
                        WHERE id = @TemplateId
                    `);
                bijdrageTemplate = templateResult.recordset[0] || null;
            }

            // Get bijdragen kosten kinderen
            const bijdragenResult = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatie.id)
                .query(`
                    SELECT 
                        id,
                        alimentatie_id as alimentatieId,
                        personen_id as personenId,
                        eigen_aandeel as eigenAandeel
                    FROM dbo.bijdragen_kosten_kinderen
                    WHERE alimentatie_id = @AlimentatieId
                `);

            // Get financiele afspraken kinderen
            const afsprakenResult = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatie.id)
                .query(`
                    SELECT 
                        id,
                        alimentatie_id as alimentatieId,
                        kind_id as kindId,
                        alimentatie_bedrag as alimentatieBedrag,
                        hoofdverblijf,
                        kinderbijslag_ontvanger as kinderbijslagOntvanger,
                        zorgkorting_percentage as zorgkortingPercentage,
                        inschrijving,
                        kindgebonden_budget as kindgebondenBudget
                    FROM dbo.financiele_afspraken_kinderen
                    WHERE alimentatie_id = @AlimentatieId
                `);

            return {
                alimentatie: alimentatie as Alimentatie,
                bijdrageTemplate: bijdrageTemplate as BijdrageTemplate | null,
                bijdragenKostenKinderen: bijdragenResult.recordset as BijdrageKostenKinderen[],
                financieleAfsprakenKinderen: afsprakenResult.recordset as FinancieleAfsprakenKinderen[]
            };
        } catch (error) {
            console.error('Error getting alimentatie by dossier ID:', error);
            throw error;
        }
    }

    // Create new alimentatie
    async createAlimentatie(dossierId: number, data: CreateAlimentatieDto): Promise<Alimentatie> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('DossierId', sql.Int, dossierId)
                .input('NettoInkomen', sql.Decimal(10, 2), data.nettoBesteedbaarGezinsinkomen || null)
                .input('KostenKinderen', sql.Decimal(10, 2), data.kostenKinderen || null)
                .input('BijdrageTemplateId', sql.Int, data.bijdrageTemplateId || null)
                .query(`
                    INSERT INTO dbo.alimentaties 
                    (dossier_id, netto_besteedbaar_gezinsinkomen, kosten_kinderen, bijdrage_template)
                    OUTPUT 
                        inserted.id,
                        inserted.dossier_id as dossierId,
                        inserted.netto_besteedbaar_gezinsinkomen as nettoBesteedbaarGezinsinkomen,
                        inserted.kosten_kinderen as kostenKinderen,
                        inserted.bijdrage_kosten_kinderen as bijdrageKostenKinderenId,
                        inserted.bijdrage_template as bijdrageTemplateId
                    VALUES (@DossierId, @NettoInkomen, @KostenKinderen, @BijdrageTemplateId)
                `);

            return result.recordset[0] as Alimentatie;
        } catch (error) {
            console.error('Error creating alimentatie:', error);
            throw error;
        }
    }

    // Update alimentatie
    async updateAlimentatie(id: number, data: UpdateAlimentatieDto): Promise<Alimentatie> {
        try {
            const pool = await this.getPool();
            
            // Build update query dynamically based on provided fields
            const updateFields = [];
            const request = pool.request();
            request.input('Id', sql.Int, id);
            
            if (data.nettoBesteedbaarGezinsinkomen !== undefined) {
                updateFields.push('netto_besteedbaar_gezinsinkomen = @NettoInkomen');
                request.input('NettoInkomen', sql.Decimal(10, 2), data.nettoBesteedbaarGezinsinkomen);
            }
            if (data.kostenKinderen !== undefined) {
                updateFields.push('kosten_kinderen = @KostenKinderen');
                request.input('KostenKinderen', sql.Decimal(10, 2), data.kostenKinderen);
            }
            if (data.bijdrageTemplateId !== undefined) {
                updateFields.push('bijdrage_template = @BijdrageTemplateId');
                request.input('BijdrageTemplateId', sql.Int, data.bijdrageTemplateId);
            }
            
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            
            const result = await request.query(`
                UPDATE dbo.alimentaties 
                SET ${updateFields.join(', ')}
                OUTPUT 
                    inserted.id,
                    inserted.dossier_id as dossierId,
                    inserted.netto_besteedbaar_gezinsinkomen as nettoBesteedbaarGezinsinkomen,
                    inserted.kosten_kinderen as kostenKinderen,
                    inserted.bijdrage_kosten_kinderen as bijdrageKostenKinderenId,
                    inserted.bijdrage_template as bijdrageTemplateId
                WHERE id = @Id
            `);

            if (!result.recordset[0]) {
                throw new Error('Alimentatie not found');
            }

            return result.recordset[0] as Alimentatie;
        } catch (error) {
            console.error('Error updating alimentatie:', error);
            throw error;
        }
    }

    // Upsert alimentatie (insert or update)
    async upsertAlimentatie(dossierId: number, data: CreateAlimentatieDto): Promise<Alimentatie> {
        try {
            const pool = await this.getPool();
            
            // Check if alimentatie already exists for this dossier
            const existingResult = await pool.request()
                .input('DossierId', sql.Int, dossierId)
                .query(`
                    SELECT id FROM dbo.alimentaties WHERE dossier_id = @DossierId
                `);
            
            if (existingResult.recordset.length > 0) {
                // Update existing alimentatie
                const alimentatieId = existingResult.recordset[0].id;
                return await this.updateAlimentatie(alimentatieId, data);
            } else {
                // Create new alimentatie
                return await this.createAlimentatie(dossierId, data);
            }
        } catch (error) {
            console.error('Error upserting alimentatie:', error);
            throw error;
        }
    }

    // Get all templates
    async getTemplates(): Promise<BijdrageTemplate[]> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .query(`
                    SELECT 
                        id,
                        omschrijving
                    FROM dbo.bijdrage_templates
                    ORDER BY id
                `);

            return result.recordset as BijdrageTemplate[];
        } catch (error) {
            console.error('Error getting templates:', error);
            throw error;
        }
    }

    // Create bijdrage kosten kinderen
    async createBijdrageKostenKinderen(alimentatieId: number, data: CreateBijdrageKostenKinderenDto): Promise<BijdrageKostenKinderen> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .input('PersonenId', sql.Int, data.personenId)
                .input('EigenAandeel', sql.Decimal(10, 2), data.eigenAandeel || null)
                .query(`
                    INSERT INTO dbo.bijdragen_kosten_kinderen 
                    (alimentatie_id, personen_id, eigen_aandeel)
                    OUTPUT 
                        inserted.id,
                        inserted.alimentatie_id as alimentatieId,
                        inserted.personen_id as personenId,
                        inserted.eigen_aandeel as eigenAandeel
                    VALUES (@AlimentatieId, @PersonenId, @EigenAandeel)
                `);

            const newRecord = result.recordset[0];
            
            // Update the alimentaties table to reference this new record if it's the first one
            await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .input('BijdrageKostenId', sql.Int, newRecord.id)
                .query(`
                    UPDATE dbo.alimentaties
                    SET bijdrage_kosten_kinderen = @BijdrageKostenId
                    WHERE id = @AlimentatieId AND bijdrage_kosten_kinderen IS NULL
                `);

            return newRecord as BijdrageKostenKinderen;
        } catch (error) {
            console.error('Error creating bijdrage kosten kinderen:', error);
            throw error;
        }
    }

    // Upsert bijdrage kosten kinderen (insert or update)
    async upsertBijdrageKostenKinderen(alimentatieId: number, data: CreateBijdrageKostenKinderenDto): Promise<BijdrageKostenKinderen> {
        try {
            const pool = await this.getPool();
            
            // Check if bijdrage kosten already exists for this alimentatie and personen
            const existingResult = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .input('PersonenId', sql.Int, data.personenId)
                .query(`
                    SELECT id FROM dbo.bijdragen_kosten_kinderen 
                    WHERE alimentatie_id = @AlimentatieId AND personen_id = @PersonenId
                `);
            
            if (existingResult.recordset.length > 0) {
                // Update existing record
                const bijdrageId = existingResult.recordset[0].id;
                const updateResult = await pool.request()
                    .input('Id', sql.Int, bijdrageId)
                    .input('EigenAandeel', sql.Decimal(10, 2), data.eigenAandeel || null)
                    .query(`
                        UPDATE dbo.bijdragen_kosten_kinderen 
                        SET eigen_aandeel = @EigenAandeel
                        OUTPUT 
                            inserted.id,
                            inserted.alimentatie_id as alimentatieId,
                            inserted.personen_id as personenId,
                            inserted.eigen_aandeel as eigenAandeel
                        WHERE id = @Id
                    `);
                return updateResult.recordset[0] as BijdrageKostenKinderen;
            } else {
                // Create new record
                return await this.createBijdrageKostenKinderen(alimentatieId, data);
            }
        } catch (error) {
            console.error('Error upserting bijdrage kosten kinderen:', error);
            throw error;
        }
    }

    // Create financiele afspraken kinderen
    async createFinancieleAfsprakenKinderen(alimentatieId: number, data: CreateFinancieleAfsprakenKinderenDto): Promise<FinancieleAfsprakenKinderen> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .input('KindId', sql.Int, data.kindId)
                .input('AlimentatieBedrag', sql.Decimal(10, 2), data.alimentatieBedrag || null)
                .input('Hoofdverblijf', sql.Int, data.hoofdverblijf || null)
                .input('KinderbijslagOntvanger', sql.Int, data.kinderbijslagOntvanger || null)
                .input('ZorgkortingPercentage', sql.Decimal(5, 2), data.zorgkortingPercentage || null)
                .input('Inschrijving', sql.Int, data.inschrijving || null)
                .input('KindgebondenBudget', sql.Int, data.kindgebondenBudget || null)
                .query(`
                    INSERT INTO dbo.financiele_afspraken_kinderen 
                    (alimentatie_id, kind_id, alimentatie_bedrag, hoofdverblijf, 
                     kinderbijslag_ontvanger, zorgkorting_percentage, inschrijving, kindgebonden_budget)
                    OUTPUT 
                        inserted.id,
                        inserted.alimentatie_id as alimentatieId,
                        inserted.kind_id as kindId,
                        inserted.alimentatie_bedrag as alimentatieBedrag,
                        inserted.hoofdverblijf,
                        inserted.kinderbijslag_ontvanger as kinderbijslagOntvanger,
                        inserted.zorgkorting_percentage as zorgkortingPercentage,
                        inserted.inschrijving,
                        inserted.kindgebonden_budget as kindgebondenBudget
                    VALUES (@AlimentatieId, @KindId, @AlimentatieBedrag, @Hoofdverblijf, 
                            @KinderbijslagOntvanger, @ZorgkortingPercentage, @Inschrijving, @KindgebondenBudget)
                `);

            return result.recordset[0] as FinancieleAfsprakenKinderen;
        } catch (error) {
            console.error('Error creating financiele afspraken kinderen:', error);
            throw error;
        }
    }

    // Upsert financiele afspraken kinderen (insert or update)
    async upsertFinancieleAfsprakenKinderen(alimentatieId: number, data: CreateFinancieleAfsprakenKinderenDto): Promise<FinancieleAfsprakenKinderen> {
        try {
            const pool = await this.getPool();
            
            console.log(`Checking for existing financiele afspraak: alimentatieId=${alimentatieId}, kindId=${data.kindId}`);
            
            // Check if financiele afspraken already exists for this alimentatie and kind
            const existingResult = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .input('KindId', sql.Int, data.kindId)
                .query(`
                    SELECT id FROM dbo.financiele_afspraken_kinderen 
                    WHERE alimentatie_id = @AlimentatieId AND kind_id = @KindId
                `);
            
            console.log(`Found ${existingResult.recordset.length} existing records`);
            
            if (existingResult.recordset.length > 0) {
                // Update existing record
                const afspraakId = existingResult.recordset[0].id;
                console.log(`Updating existing financiele afspraak with id=${afspraakId}`);
                
                const result = await pool.request()
                    .input('Id', sql.Int, afspraakId)
                    .input('AlimentatieBedrag', sql.Decimal(10, 2), data.alimentatieBedrag || null)
                    .input('Hoofdverblijf', sql.Int, data.hoofdverblijf || null)
                    .input('KinderbijslagOntvanger', sql.Int, data.kinderbijslagOntvanger || null)
                    .input('ZorgkortingPercentage', sql.Decimal(5, 2), data.zorgkortingPercentage || null)
                    .input('Inschrijving', sql.Int, data.inschrijving || null)
                    .input('KindgebondenBudget', sql.Int, data.kindgebondenBudget || null)
                    .query(`
                        UPDATE dbo.financiele_afspraken_kinderen
                        SET alimentatie_bedrag = @AlimentatieBedrag,
                            hoofdverblijf = @Hoofdverblijf,
                            kinderbijslag_ontvanger = @KinderbijslagOntvanger,
                            zorgkorting_percentage = @ZorgkortingPercentage,
                            inschrijving = @Inschrijving,
                            kindgebonden_budget = @KindgebondenBudget
                        OUTPUT 
                            inserted.id,
                            inserted.alimentatie_id as alimentatieId,
                            inserted.kind_id as kindId,
                            inserted.alimentatie_bedrag as alimentatieBedrag,
                            inserted.hoofdverblijf,
                            inserted.kinderbijslag_ontvanger as kinderbijslagOntvanger,
                            inserted.zorgkorting_percentage as zorgkortingPercentage,
                            inserted.inschrijving,
                            inserted.kindgebonden_budget as kindgebondenBudget
                        WHERE id = @Id
                    `);
                return result.recordset[0] as FinancieleAfsprakenKinderen;
            } else {
                // Create new record
                console.log(`Creating new financiele afspraak`);
                return await this.createFinancieleAfsprakenKinderen(alimentatieId, data);
            }
        } catch (error) {
            console.error('Error upserting financiele afspraken kinderen:', error);
            throw error;
        }
    }

    // Delete all financiele afspraken for an alimentatie
    async deleteFinancieleAfsprakenByAlimentatieId(alimentatieId: number): Promise<void> {
        try {
            const pool = await this.getPool();
            await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .query(`
                    DELETE FROM dbo.financiele_afspraken_kinderen 
                    WHERE alimentatie_id = @AlimentatieId
                `);
            console.log(`Deleted all financiele afspraken for alimentatieId=${alimentatieId}`);
        } catch (error) {
            console.error('Error deleting financiele afspraken:', error);
            throw error;
        }
    }

    // Delete all bijdrage kosten for an alimentatie
    async deleteBijdrageKostenByAlimentatieId(alimentatieId: number): Promise<void> {
        try {
            const pool = await this.getPool();
            await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .query(`
                    DELETE FROM dbo.bijdragen_kosten_kinderen 
                    WHERE alimentatie_id = @AlimentatieId
                `);
            console.log(`Deleted all bijdrage kosten for alimentatieId=${alimentatieId}`);
        } catch (error) {
            console.error('Error deleting bijdrage kosten:', error);
            throw error;
        }
    }

    // Get bijdrage kosten kinderen by alimentatie ID
    async getBijdrageKostenByAlimentatieId(alimentatieId: number): Promise<BijdrageKostenKinderen[]> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .query(`
                    SELECT 
                        id,
                        alimentatie_id as alimentatieId,
                        personen_id as personenId,
                        eigen_aandeel as eigenAandeel
                    FROM dbo.bijdragen_kosten_kinderen
                    WHERE alimentatie_id = @AlimentatieId
                `);

            return result.recordset as BijdrageKostenKinderen[];
        } catch (error) {
            console.error('Error getting bijdrage kosten by alimentatie ID:', error);
            throw error;
        }
    }

    // Get financiele afspraken kinderen by alimentatie ID
    async getFinancieleAfsprakenByAlimentatieId(alimentatieId: number): Promise<FinancieleAfsprakenKinderen[]> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .query(`
                    SELECT 
                        id,
                        alimentatie_id as alimentatieId,
                        kind_id as kindId,
                        alimentatie_bedrag as alimentatieBedrag,
                        hoofdverblijf,
                        kinderbijslag_ontvanger as kinderbijslagOntvanger,
                        zorgkorting_percentage as zorgkortingPercentage,
                        inschrijving,
                        kindgebonden_budget as kindgebondenBudget
                    FROM dbo.financiele_afspraken_kinderen
                    WHERE alimentatie_id = @AlimentatieId
                `);

            return result.recordset as FinancieleAfsprakenKinderen[];
        } catch (error) {
            console.error('Error getting financiele afspraken by alimentatie ID:', error);
            throw error;
        }
    }

    // Check if user has access to alimentatie
    async checkAlimentatieAccess(alimentatieId: number, userId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('AlimentatieId', sql.Int, alimentatieId)
                .input('UserId', sql.Int, userId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM dbo.alimentaties a
                    INNER JOIN dbo.dossiers d ON a.dossier_id = d.id
                    WHERE a.id = @AlimentatieId AND d.gebruiker_id = @UserId
                `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking alimentatie access:', error);
            throw error;
        }
    }
}