import sql from 'mssql';
import { getPool } from '../config/database';
import {
    CommunicatieAfspraken,
    CreateCommunicatieAfsprakenDto,
    UpdateCommunicatieAfsprakenDto
} from '../models/CommunicatieAfspraken';

export class CommunicatieAfsprakenService {
    private async getPool(): Promise<sql.ConnectionPool> {
        return await getPool();
    }

    /**
     * Get communicatie afspraken by dossier ID
     */
    async getByDossierId(dossierId: number): Promise<CommunicatieAfspraken | null> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('DossierId', sql.Int, dossierId)
                .query(`
                    SELECT
                        id,
                        dossier_id as dossierId,
                        villa_pinedo as villaPinedo,
                        villa_pinedo_kinderen as villaPinedoKinderen,
                        kinderen_betrokkenheid as kinderenBetrokkenheid,
                        kies_methode as kiesMethode,
                        opvang,
                        informatie_uitwisseling as informatieUitwisseling,
                        bijlage_beslissingen as bijlageBeslissingen,
                        social_media as socialMedia,
                        mobiel_tablet as mobielTablet,
                        id_bewijzen as idBewijzen,
                        aansprakelijkheidsverzekering,
                        ziektekostenverzekering,
                        toestemming_reizen as toestemmingReizen,
                        jongmeerderjarige,
                        studiekosten,
                        bankrekening_kinderen as bankrekeningKinderen,
                        evaluatie,
                        parenting_coordinator as parentingCoordinator,
                        mediation_clausule as mediationClausule,
                        created_at as createdAt,
                        updated_at as updatedAt
                    FROM dbo.communicatie_afspraken
                    WHERE dossier_id = @DossierId
                `);

            if (!result.recordset[0]) {
                return null;
            }

            return result.recordset[0] as CommunicatieAfspraken;
        } catch (error) {
            console.error('Error getting communicatie afspraken by dossier ID:', error);
            throw error;
        }
    }

    /**
     * Get communicatie afspraken by ID
     */
    async getById(id: number): Promise<CommunicatieAfspraken | null> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .query(`
                    SELECT
                        id,
                        dossier_id as dossierId,
                        villa_pinedo as villaPinedo,
                        villa_pinedo_kinderen as villaPinedoKinderen,
                        kinderen_betrokkenheid as kinderenBetrokkenheid,
                        kies_methode as kiesMethode,
                        opvang,
                        informatie_uitwisseling as informatieUitwisseling,
                        bijlage_beslissingen as bijlageBeslissingen,
                        social_media as socialMedia,
                        mobiel_tablet as mobielTablet,
                        id_bewijzen as idBewijzen,
                        aansprakelijkheidsverzekering,
                        ziektekostenverzekering,
                        toestemming_reizen as toestemmingReizen,
                        jongmeerderjarige,
                        studiekosten,
                        bankrekening_kinderen as bankrekeningKinderen,
                        evaluatie,
                        parenting_coordinator as parentingCoordinator,
                        mediation_clausule as mediationClausule,
                        created_at as createdAt,
                        updated_at as updatedAt
                    FROM dbo.communicatie_afspraken
                    WHERE id = @Id
                `);

            if (!result.recordset[0]) {
                return null;
            }

            return result.recordset[0] as CommunicatieAfspraken;
        } catch (error) {
            console.error('Error getting communicatie afspraken by ID:', error);
            throw error;
        }
    }

    /**
     * Create new communicatie afspraken
     */
    async create(data: CreateCommunicatieAfsprakenDto): Promise<CommunicatieAfspraken> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('DossierId', sql.Int, data.dossierId)
                .input('VillaPinedo', sql.Bit, data.villaPinedo ?? null)
                .input('VillaPinedoKinderen', sql.NVarChar(10), data.villaPinedoKinderen || null)
                .input('KinderenBetrokkenheid', sql.NVarChar(50), data.kinderenBetrokkenheid || null)
                .input('KiesMethode', sql.NVarChar(50), data.kiesMethode || null)
                .input('Opvang', sql.NVarChar(100), data.opvang || null)
                .input('InformatieUitwisseling', sql.NVarChar(100), data.informatieUitwisseling || null)
                .input('BijlageBeslissingen', sql.NVarChar(50), data.bijlageBeslissingen || null)
                .input('SocialMedia', sql.NVarChar(100), data.socialMedia || null)
                .input('MobielTablet', sql.NVarChar(100), data.mobielTablet || null)
                .input('IdBewijzen', sql.NVarChar(100), data.idBewijzen || null)
                .input('Aansprakelijkheidsverzekering', sql.NVarChar(100), data.aansprakelijkheidsverzekering || null)
                .input('Ziektekostenverzekering', sql.NVarChar(100), data.ziektekostenverzekering || null)
                .input('ToestemmingReizen', sql.NVarChar(100), data.toestemmingReizen || null)
                .input('Jongmeerderjarige', sql.NVarChar(100), data.jongmeerderjarige || null)
                .input('Studiekosten', sql.NVarChar(100), data.studiekosten || null)
                .input('BankrekeningKinderen', sql.NVarChar(100), data.bankrekeningKinderen || null)
                .input('Evaluatie', sql.NVarChar(50), data.evaluatie || null)
                .input('ParentingCoordinator', sql.NVarChar(100), data.parentingCoordinator || null)
                .input('MediationClausule', sql.NVarChar(50), data.mediationClausule || null)
                .query(`
                    INSERT INTO dbo.communicatie_afspraken
                    (dossier_id, villa_pinedo, villa_pinedo_kinderen, kinderen_betrokkenheid,
                     kies_methode, opvang, informatie_uitwisseling,
                     bijlage_beslissingen, social_media, mobiel_tablet, id_bewijzen,
                     aansprakelijkheidsverzekering, ziektekostenverzekering, toestemming_reizen,
                     jongmeerderjarige, studiekosten, bankrekening_kinderen, evaluatie,
                     parenting_coordinator, mediation_clausule)
                    OUTPUT
                        inserted.id,
                        inserted.dossier_id as dossierId,
                        inserted.villa_pinedo as villaPinedo,
                        inserted.villa_pinedo_kinderen as villaPinedoKinderen,
                        inserted.kinderen_betrokkenheid as kinderenBetrokkenheid,
                        inserted.kies_methode as kiesMethode,
                        inserted.opvang,
                        inserted.informatie_uitwisseling as informatieUitwisseling,
                        inserted.bijlage_beslissingen as bijlageBeslissingen,
                        inserted.social_media as socialMedia,
                        inserted.mobiel_tablet as mobielTablet,
                        inserted.id_bewijzen as idBewijzen,
                        inserted.aansprakelijkheidsverzekering,
                        inserted.ziektekostenverzekering,
                        inserted.toestemming_reizen as toestemmingReizen,
                        inserted.jongmeerderjarige,
                        inserted.studiekosten,
                        inserted.bankrekening_kinderen as bankrekeningKinderen,
                        inserted.evaluatie,
                        inserted.parenting_coordinator as parentingCoordinator,
                        inserted.mediation_clausule as mediationClausule,
                        inserted.created_at as createdAt,
                        inserted.updated_at as updatedAt
                    VALUES (@DossierId, @VillaPinedo, @VillaPinedoKinderen, @KinderenBetrokkenheid,
                            @KiesMethode, @Opvang, @InformatieUitwisseling,
                            @BijlageBeslissingen, @SocialMedia, @MobielTablet, @IdBewijzen,
                            @Aansprakelijkheidsverzekering, @Ziektekostenverzekering, @ToestemmingReizen,
                            @Jongmeerderjarige, @Studiekosten, @BankrekeningKinderen, @Evaluatie,
                            @ParentingCoordinator, @MediationClausule)
                `);

            return result.recordset[0] as CommunicatieAfspraken;
        } catch (error) {
            console.error('Error creating communicatie afspraken:', error);
            throw error;
        }
    }

    /**
     * Update existing communicatie afspraken
     */
    async update(id: number, data: UpdateCommunicatieAfsprakenDto): Promise<CommunicatieAfspraken | null> {
        try {
            const pool = await this.getPool();

            // Build update query dynamically based on provided fields
            const updateFields = [];
            const request = pool.request();
            request.input('Id', sql.Int, id);

            if (data.villaPinedo !== undefined) {
                updateFields.push('villa_pinedo = @VillaPinedo');
                request.input('VillaPinedo', sql.Bit, data.villaPinedo);
            }
            if (data.villaPinedoKinderen !== undefined) {
                updateFields.push('villa_pinedo_kinderen = @VillaPinedoKinderen');
                request.input('VillaPinedoKinderen', sql.NVarChar(10), data.villaPinedoKinderen);
            }
            if (data.kinderenBetrokkenheid !== undefined) {
                updateFields.push('kinderen_betrokkenheid = @KinderenBetrokkenheid');
                request.input('KinderenBetrokkenheid', sql.NVarChar(50), data.kinderenBetrokkenheid);
            }
            if (data.kiesMethode !== undefined) {
                updateFields.push('kies_methode = @KiesMethode');
                request.input('KiesMethode', sql.NVarChar(50), data.kiesMethode);
            }
            if (data.opvang !== undefined) {
                updateFields.push('opvang = @Opvang');
                request.input('Opvang', sql.NVarChar(100), data.opvang);
            }
            if (data.informatieUitwisseling !== undefined) {
                updateFields.push('informatie_uitwisseling = @InformatieUitwisseling');
                request.input('InformatieUitwisseling', sql.NVarChar(100), data.informatieUitwisseling);
            }
            if (data.bijlageBeslissingen !== undefined) {
                updateFields.push('bijlage_beslissingen = @BijlageBeslissingen');
                request.input('BijlageBeslissingen', sql.NVarChar(50), data.bijlageBeslissingen);
            }
            if (data.socialMedia !== undefined) {
                updateFields.push('social_media = @SocialMedia');
                request.input('SocialMedia', sql.NVarChar(100), data.socialMedia);
            }
            if (data.mobielTablet !== undefined) {
                updateFields.push('mobiel_tablet = @MobielTablet');
                request.input('MobielTablet', sql.NVarChar(100), data.mobielTablet);
            }
            if (data.idBewijzen !== undefined) {
                updateFields.push('id_bewijzen = @IdBewijzen');
                request.input('IdBewijzen', sql.NVarChar(100), data.idBewijzen);
            }
            if (data.aansprakelijkheidsverzekering !== undefined) {
                updateFields.push('aansprakelijkheidsverzekering = @Aansprakelijkheidsverzekering');
                request.input('Aansprakelijkheidsverzekering', sql.NVarChar(100), data.aansprakelijkheidsverzekering);
            }
            if (data.ziektekostenverzekering !== undefined) {
                updateFields.push('ziektekostenverzekering = @Ziektekostenverzekering');
                request.input('Ziektekostenverzekering', sql.NVarChar(100), data.ziektekostenverzekering);
            }
            if (data.toestemmingReizen !== undefined) {
                updateFields.push('toestemming_reizen = @ToestemmingReizen');
                request.input('ToestemmingReizen', sql.NVarChar(100), data.toestemmingReizen);
            }
            if (data.jongmeerderjarige !== undefined) {
                updateFields.push('jongmeerderjarige = @Jongmeerderjarige');
                request.input('Jongmeerderjarige', sql.NVarChar(100), data.jongmeerderjarige);
            }
            if (data.studiekosten !== undefined) {
                updateFields.push('studiekosten = @Studiekosten');
                request.input('Studiekosten', sql.NVarChar(100), data.studiekosten);
            }
            if (data.bankrekeningKinderen !== undefined) {
                updateFields.push('bankrekening_kinderen = @BankrekeningKinderen');
                request.input('BankrekeningKinderen', sql.NVarChar(100), data.bankrekeningKinderen);
            }
            if (data.evaluatie !== undefined) {
                updateFields.push('evaluatie = @Evaluatie');
                request.input('Evaluatie', sql.NVarChar(50), data.evaluatie);
            }
            if (data.parentingCoordinator !== undefined) {
                updateFields.push('parenting_coordinator = @ParentingCoordinator');
                request.input('ParentingCoordinator', sql.NVarChar(100), data.parentingCoordinator);
            }
            if (data.mediationClausule !== undefined) {
                updateFields.push('mediation_clausule = @MediationClausule');
                request.input('MediationClausule', sql.NVarChar(50), data.mediationClausule);
            }

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            // Always update the updated_at timestamp
            updateFields.push('updated_at = GETDATE()');

            const result = await request.query(`
                UPDATE dbo.communicatie_afspraken
                SET ${updateFields.join(', ')}
                OUTPUT
                    inserted.id,
                    inserted.dossier_id as dossierId,
                    inserted.villa_pinedo as villaPinedo,
                    inserted.villa_pinedo_kinderen as villaPinedoKinderen,
                    inserted.kinderen_betrokkenheid as kinderenBetrokkenheid,
                    inserted.kies_methode as kiesMethode,
                    inserted.opvang,
                    inserted.informatie_uitwisseling as informatieUitwisseling,
                    inserted.bijlage_beslissingen as bijlageBeslissingen,
                    inserted.social_media as socialMedia,
                    inserted.mobiel_tablet as mobielTablet,
                    inserted.id_bewijzen as idBewijzen,
                    inserted.aansprakelijkheidsverzekering,
                    inserted.ziektekostenverzekering,
                    inserted.toestemming_reizen as toestemmingReizen,
                    inserted.jongmeerderjarige,
                    inserted.studiekosten,
                    inserted.bankrekening_kinderen as bankrekeningKinderen,
                    inserted.evaluatie,
                    inserted.parenting_coordinator as parentingCoordinator,
                    inserted.mediation_clausule as mediationClausule,
                    inserted.created_at as createdAt,
                    inserted.updated_at as updatedAt
                WHERE id = @Id
            `);

            if (!result.recordset[0]) {
                return null;
            }

            return result.recordset[0] as CommunicatieAfspraken;
        } catch (error) {
            console.error('Error updating communicatie afspraken:', error);
            throw error;
        }
    }

    /**
     * Delete communicatie afspraken
     */
    async delete(id: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .query(`
                    DELETE FROM dbo.communicatie_afspraken
                    WHERE id = @Id
                `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting communicatie afspraken:', error);
            throw error;
        }
    }

    /**
     * Check if user has access to communicatie afspraken (via dossier ownership)
     */
    async checkAccess(id: number, userId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .input('UserId', sql.Int, userId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM dbo.communicatie_afspraken ca
                    INNER JOIN dbo.dossiers d ON ca.dossier_id = d.id
                    WHERE ca.id = @Id AND d.gebruiker_id = @UserId
                `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking communicatie afspraken access:', error);
            throw error;
        }
    }
}
