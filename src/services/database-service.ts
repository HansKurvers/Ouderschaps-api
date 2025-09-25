import sql from 'mssql';
import { initializeDatabase, getPool } from '../config/database';
import {
    CompleteDossierData,
    CreateOmgangDto,
    CreateZorgDto,
    Dag,
    Dagdeel,
    Dossier,
    Omgang,
    OuderschapsplanInfo,
    CreateOuderschapsplanInfoDto,
    UpdateOuderschapsplanInfoDto,
    Persoon,
    RegelingTemplate,
    RelatieType,
    Rol,
    Schoolvakantie,
    UpdateOmgangDto,
    UpdateZorgDto,
    WeekRegeling,
    Zorg,
    ZorgCategorie,
    ZorgSituatie,
} from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

export class DossierDatabaseService {
    async initialize(): Promise<void> {
        try {
            await initializeDatabase();
        } catch (error) {
            console.error('Failed to initialize database service:', error);
            throw error;
        }
    }

    async close(): Promise<void> {
        // Don't close the shared pool in Azure Functions
        // The pool will be reused across function invocations
    }

    private async getPool(): Promise<sql.ConnectionPool> {
        return await getPool();
    }

    async getAllDossiers(userID: number): Promise<Dossier[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('UserID', sql.Int, userID);

            const result = await request.query(`
                SELECT 
                    id,
                    dossier_nummer,
                    gebruiker_id,
                    status,
                    is_anoniem,
                    aangemaakt_op,
                    gewijzigd_op
                FROM dbo.dossiers 
                WHERE gebruiker_id = @UserID
                ORDER BY gewijzigd_op DESC
            `);

            return result.recordset.map(DbMappers.toDossier);
        } catch (error) {
            console.error('Error getting all dossiers:', error);
            throw error;
        }
    }

    async getDossierById(dossierID: number): Promise<Dossier | null> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);

            const result = await request.query(`
                SELECT 
                    id,
                    dossier_nummer,
                    gebruiker_id,
                    status,
                    is_anoniem,
                    aangemaakt_op,
                    gewijzigd_op
                FROM dbo.dossiers 
                WHERE id = @DossierID
            `);

            return result.recordset[0] ? DbMappers.toDossier(result.recordset[0]) : null;
        } catch (error) {
            console.error('Error getting dossier by ID:', error);
            throw error;
        }
    }

    async checkDossierAccess(dossierID: number, userID: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);
            request.input('UserID', sql.Int, userID);

            const result = await request.query(`
                SELECT COUNT(*) as count
                FROM dbo.dossiers
                WHERE id = @DossierID AND gebruiker_id = @UserID
            `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking dossier access:', error);
            throw error;
        }
    }

    async createDossier(userID: number): Promise<Dossier> {
        try {
            const pool = await this.getPool();
            const dossierNumber = await this.generateNextDossierNumber();

            const request = pool.request();
            request.input('DossierNummer', sql.NVarChar, dossierNumber);
            request.input('GebruikerID', sql.Int, userID);
            request.input('Status', sql.Bit, false);

            const result = await request.query(`
                INSERT INTO dbo.dossiers (dossier_nummer, gebruiker_id, status)
                OUTPUT INSERTED.*
                VALUES (@DossierNummer, @GebruikerID, @Status)
            `);

            return DbMappers.toDossier(result.recordset[0]);
        } catch (error) {
            console.error('Error creating dossier:', error);
            throw error;
        }
    }

    private async logRelatedData(transaction: sql.Transaction, dossierID: number): Promise<void> {
        try {
            // Check for related data in all related tables
            const tables = [
                'dbo.alimentaties',
                'dbo.ouderschapsplan_info',
                'dbo.omgang',
                'dbo.zorg',
                'dbo.dossiers_kinderen',
                'dbo.dossiers_partijen'
            ];

            for (const table of tables) {
                const result = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query(`SELECT COUNT(*) as count FROM ${table} WHERE dossier_id = @DossierID`);

                console.log(`${table}: ${result.recordset[0].count} records`);
            }

            // Check for bijdragen_kosten_kinderen via alimentaties
            const bkkResult = await transaction
                .request()
                .input('DossierID', sql.Int, dossierID)
                .query(`
                    SELECT COUNT(*) as count
                    FROM dbo.bijdragen_kosten_kinderen bkk
                    INNER JOIN dbo.alimentaties a ON bkk.alimentatie_id = a.id
                    WHERE a.dossier_id = @DossierID
                `);
            console.log(`bijdragen_kosten_kinderen (via alimentaties): ${bkkResult.recordset[0].count} records`);

            // Check for financiele_afspraken_kinderen via alimentaties
            const fakResult = await transaction
                .request()
                .input('DossierID', sql.Int, dossierID)
                .query(`
                    SELECT COUNT(*) as count
                    FROM dbo.financiele_afspraken_kinderen fak
                    INNER JOIN dbo.alimentaties a ON fak.alimentatie_id = a.id
                    WHERE a.dossier_id = @DossierID
                `);
            console.log(`financiele_afspraken_kinderen (via alimentaties): ${fakResult.recordset[0].count} records`);

        } catch (error) {
            console.warn('Could not log related data:', error);
        }
    }

    async deleteDossier(dossierID: number): Promise<boolean> {
        const pool = await this.getPool();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            console.log(`Starting cascade delete for dossier ID: ${dossierID}`);

            // First, let's check what related data exists
            await this.logRelatedData(transaction, dossierID);

            // Delete related data in correct order (from most dependent to least)

            // 1. Delete alimentatie related tables first (most dependent)
            // Delete bijdragen_kosten_kinderen first
            try {
                const bijdragenKostenResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query(`
                        DELETE bkk
                        FROM dbo.bijdragen_kosten_kinderen bkk
                        INNER JOIN dbo.alimentaties a ON bkk.alimentatie_id = a.id
                        WHERE a.dossier_id = @DossierID
                    `);
                console.log(`Deleted ${bijdragenKostenResult.rowsAffected[0]} bijdragen_kosten_kinderen records`);
            } catch (error) {
                console.error('Error deleting bijdragen_kosten_kinderen records:', error);
                throw error;
            }

            // Delete financiele_afspraken_kinderen second
            try {
                const financieleAfsprakenResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query(`
                        DELETE fak
                        FROM dbo.financiele_afspraken_kinderen fak
                        INNER JOIN dbo.alimentaties a ON fak.alimentatie_id = a.id
                        WHERE a.dossier_id = @DossierID
                    `);
                console.log(`Deleted ${financieleAfsprakenResult.rowsAffected[0]} financiele_afspraken_kinderen records`);
            } catch (error) {
                console.error('Error deleting financiele_afspraken_kinderen records:', error);
                throw error;
            }

            // Delete alimentaties third
            try {
                const alimentatiesResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query('DELETE FROM dbo.alimentaties WHERE dossier_id = @DossierID');
                console.log(`Deleted ${alimentatiesResult.rowsAffected[0]} alimentaties records`);
            } catch (error) {
                console.error('Error deleting alimentaties records:', error);
                throw error;
            }

            // 2. Delete ouderschapsplan info
            try {
                const ouderschapsplanResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query('DELETE FROM dbo.ouderschapsplan_info WHERE dossier_id = @DossierID');
                console.log(`Deleted ${ouderschapsplanResult.rowsAffected[0]} ouderschapsplan_info records`);
            } catch (error) {
                console.error('Error deleting ouderschapsplan_info records:', error);
                throw error;
            }

            // 3. Delete omgang records
            try {
                const omgangResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query('DELETE FROM dbo.omgang WHERE dossier_id = @DossierID');
                console.log(`Deleted ${omgangResult.rowsAffected[0]} omgang records`);
            } catch (error) {
                console.error('Error deleting omgang records:', error);
                throw error;
            }

            // 4. Delete zorg records
            try {
                const zorgResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query('DELETE FROM dbo.zorg WHERE dossier_id = @DossierID');
                console.log(`Deleted ${zorgResult.rowsAffected[0]} zorg records`);
            } catch (error) {
                console.error('Error deleting zorg records:', error);
                throw error;
            }

            // 5. Delete dossier-child relationships
            try {
                const kinderenResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query('DELETE FROM dbo.dossiers_kinderen WHERE dossier_id = @DossierID');
                console.log(`Deleted ${kinderenResult.rowsAffected[0]} dossiers_kinderen records`);
            } catch (error) {
                console.error('Error deleting dossiers_kinderen records:', error);
                throw error;
            }

            // 6. Delete dossier-party relationships
            try {
                const partijenResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query('DELETE FROM dbo.dossiers_partijen WHERE dossier_id = @DossierID');
                console.log(`Deleted ${partijenResult.rowsAffected[0]} dossiers_partijen records`);
            } catch (error) {
                console.error('Error deleting dossiers_partijen records:', error);
                throw error;
            }

            // 7. Finally delete the dossier itself
            try {
                const dossierResult = await transaction
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query('DELETE FROM dbo.dossiers WHERE id = @DossierID');
                console.log(`Deleted ${dossierResult.rowsAffected[0]} dossier records`);

                await transaction.commit();
                console.log(`Successfully completed cascade delete for dossier ID: ${dossierID}`);

                return dossierResult.rowsAffected[0] > 0;
            } catch (error) {
                console.error('Error deleting dossier record:', error);
                throw error;
            }
        } catch (error) {
            await transaction.rollback();
            console.error('Error during cascade delete of dossier:', error);

            // Provide more detailed error information
            if (error instanceof Error) {
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }

            throw new Error(`Failed to delete dossier ${dossierID}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async inspectDossierRelations(dossierID: number): Promise<any> {
        try {
            const pool = await this.getPool();
            const inspectionResults: any = {};

            // Check main dossier
            const dossierResult = await pool
                .request()
                .input('DossierID', sql.Int, dossierID)
                .query('SELECT * FROM dbo.dossiers WHERE id = @DossierID');

            inspectionResults.dossier = {
                exists: dossierResult.recordset.length > 0,
                data: dossierResult.recordset[0] || null
            };

            if (dossierResult.recordset.length === 0) {
                return inspectionResults;
            }

            // Check for related data in all related tables
            const tables = [
                'dbo.alimentaties',
                'dbo.ouderschapsplan_info',
                'dbo.omgang',
                'dbo.zorg',
                'dbo.dossiers_kinderen',
                'dbo.dossiers_partijen'
            ];

            for (const table of tables) {
                try {
                    const result = await pool
                        .request()
                        .input('DossierID', sql.Int, dossierID)
                        .query(`SELECT COUNT(*) as count FROM ${table} WHERE dossier_id = @DossierID`);

                    const detailResult = await pool
                        .request()
                        .input('DossierID', sql.Int, dossierID)
                        .query(`SELECT TOP 5 * FROM ${table} WHERE dossier_id = @DossierID`);

                    inspectionResults[table] = {
                        count: result.recordset[0].count,
                        sampleRecords: detailResult.recordset
                    };
                } catch (err) {
                    inspectionResults[table] = {
                        error: `Table might not exist: ${err instanceof Error ? err.message : 'Unknown error'}`
                    };
                }
            }

            // Check for alimentatie-related child tables
            try {
                const bkkResult = await pool
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query(`
                        SELECT COUNT(*) as count
                        FROM dbo.bijdragen_kosten_kinderen bkk
                        INNER JOIN dbo.alimentaties a ON bkk.alimentatie_id = a.id
                        WHERE a.dossier_id = @DossierID
                    `);

                const bkkDetailResult = await pool
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query(`
                        SELECT TOP 5 bkk.*, a.dossier_id
                        FROM dbo.bijdragen_kosten_kinderen bkk
                        INNER JOIN dbo.alimentaties a ON bkk.alimentatie_id = a.id
                        WHERE a.dossier_id = @DossierID
                    `);

                inspectionResults['bijdragen_kosten_kinderen'] = {
                    count: bkkResult.recordset[0].count,
                    sampleRecords: bkkDetailResult.recordset
                };
            } catch (err) {
                inspectionResults['bijdragen_kosten_kinderen'] = {
                    error: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
                };
            }

            try {
                const fakResult = await pool
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query(`
                        SELECT COUNT(*) as count
                        FROM dbo.financiele_afspraken_kinderen fak
                        INNER JOIN dbo.alimentaties a ON fak.alimentatie_id = a.id
                        WHERE a.dossier_id = @DossierID
                    `);

                const fakDetailResult = await pool
                    .request()
                    .input('DossierID', sql.Int, dossierID)
                    .query(`
                        SELECT TOP 5 fak.*, a.dossier_id
                        FROM dbo.financiele_afspraken_kinderen fak
                        INNER JOIN dbo.alimentaties a ON fak.alimentatie_id = a.id
                        WHERE a.dossier_id = @DossierID
                    `);

                inspectionResults['financiele_afspraken_kinderen'] = {
                    count: fakResult.recordset[0].count,
                    sampleRecords: fakDetailResult.recordset
                };
            } catch (err) {
                inspectionResults['financiele_afspraken_kinderen'] = {
                    error: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
                };
            }

            return inspectionResults;

        } catch (error) {
            throw new Error(`Failed to inspect dossier relations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async updateDossierStatus(dossierID: number, status: boolean): Promise<Dossier> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);
            request.input('Status', sql.Bit, status);

            const result = await request.query(`
                UPDATE dbo.dossiers 
                SET status = @Status, gewijzigd_op = GETDATE()
                WHERE id = @DossierID;
                
                SELECT 
                    id,
                    dossier_nummer,
                    gebruiker_id,
                    status,
                    is_anoniem,
                    aangemaakt_op,
                    gewijzigd_op
                FROM dbo.dossiers 
                WHERE id = @DossierID;
            `);

            if (result.recordset.length === 0) {
                throw new Error('Dossier not found');
            }

            return DbMappers.toDossier(result.recordset[0]);
        } catch (error) {
            console.error('Error updating dossier status:', error);
            throw error;
        }
    }

    async updateDossierAnonymity(dossierID: number, isAnoniem: boolean, userID: number): Promise<Dossier> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);
            request.input('UserID', sql.Int, userID);
            request.input('IsAnoniem', sql.Bit, isAnoniem);

            const result = await request.query(`
                UPDATE dbo.dossiers 
                SET is_anoniem = @IsAnoniem, gewijzigd_op = GETDATE()
                WHERE id = @DossierID AND gebruiker_id = @UserID;
                
                SELECT 
                    id,
                    dossier_nummer,
                    gebruiker_id,
                    status,
                    is_anoniem,
                    aangemaakt_op,
                    gewijzigd_op
                FROM dbo.dossiers 
                WHERE id = @DossierID;
            `);

            if (result.recordset.length === 0) {
                throw new Error('Dossier not found or access denied');
            }

            return DbMappers.toDossier(result.recordset[0]);
        } catch (error) {
            console.error('Error updating dossier anonymity:', error);
            throw error;
        }
    }

    async generateNextDossierNumber(): Promise<string> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            const result = await request.query(`
                SELECT MAX(CAST(dossier_nummer AS INT)) as maxNumber
                FROM dbo.dossiers
                WHERE ISNUMERIC(dossier_nummer) = 1
            `);

            const maxNumber = result.recordset[0].maxNumber || 999;
            const nextNumber = maxNumber + 1;

            return nextNumber.toString();
        } catch (error) {
            console.error('Error generating dossier number:', error);
            // Fallback to timestamp-based number
            return Date.now().toString();
        }
    }

    async getPartijen(dossierID: number): Promise<Array<{ persoon: Persoon; rol: Rol }>> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);

            const result = await request.query(`
                SELECT 
                    p.*,
                    r.id as rol_id,
                    r.naam as rol_naam
                FROM dbo.dossiers_partijen dp
                JOIN dbo.personen p ON dp.persoon_id = p.id
                JOIN dbo.rollen r ON dp.rol_id = r.id
                WHERE dp.dossier_id = @DossierID
                ORDER BY r.id
            `);

            return result.recordset.map(row => ({
                persoon: DbMappers.toPersoon(row),
                rol: {
                    id: row.rol_id,
                    naam: row.rol_naam,
                },
            }));
        } catch (error) {
            console.error('Error getting partijen:', error);
            throw error;
        }
    }

    async getKinderen(
        dossierID: number
    ): Promise<
        Array<{ id: number; kind: Persoon; ouders: Array<{ ouder: Persoon; relatieType: RelatieType }> }>
    > {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);

            // Get children associated with this dossier
            const kinderenResult = await request.query(`
                SELECT dk.id as dossier_kind_id, p.*
                FROM dbo.dossiers_kinderen dk
                JOIN dbo.personen p ON dk.kind_id = p.id
                WHERE dk.dossier_id = @DossierID
            `);

            const kinderen = [];

            // For each child, get their parents
            for (const kindRow of kinderenResult.recordset) {
                const kind = DbMappers.toPersoon(kindRow);
                const dossierKindId = kindRow.dossier_kind_id;

                const oudersRequest = pool.request();
                oudersRequest.input('KindID', sql.Int, kind.id);

                const oudersResult = await oudersRequest.query(`
                    SELECT 
                        p.*,
                        rt.id as relatie_type_id,
                        rt.naam as relatie_type_naam
                    FROM dbo.kinderen_ouders ko
                    JOIN dbo.personen p ON ko.ouder_id = p.id
                    JOIN dbo.relatie_types rt ON ko.relatie_type_id = rt.id
                    WHERE ko.kind_id = @KindID
                `);

                const ouders = oudersResult.recordset.map(row => ({
                    ouder: DbMappers.toPersoon(row),
                    relatieType: {
                        id: row.relatie_type_id,
                        naam: row.relatie_type_naam,
                    },
                }));

                kinderen.push({ id: dossierKindId, kind, ouders });
            }

            return kinderen;
        } catch (error) {
            console.error('Error getting kinderen:', error);
            throw error;
        }
    }


    async getCompleteDossierData(dossierID: number): Promise<CompleteDossierData | null> {
        try {
            const dossier = await this.getDossierById(dossierID);
            if (!dossier) {
                return null;
            }
            const [partijen, kinderen] = await Promise.all([
                this.getPartijen(dossierID),
                this.getKinderen(dossierID),
            ]);

            return {
                dossier,
                partijen,
                kinderen,
            };
        } catch (error) {
            console.error('Error getting complete dossier data:', error);
            throw error;
        }
    }

    async createOrUpdatePersoon(persoonData: Partial<Persoon>): Promise<Persoon> {
        try {
            const pool = await this.getPool();
            const dto = DbMappers.toPersoonDto(persoonData as Persoon);

            if (persoonData.id) {
                // Update existing person
                const request = pool.request();
                request.input('Id', sql.Int, persoonData.id);
                request.input('Voorletters', sql.NVarChar, dto.voorletters);
                request.input('Voornamen', sql.NVarChar, dto.voornamen);
                request.input('Roepnaam', sql.NVarChar, dto.roepnaam);
                request.input('Geslacht', sql.NVarChar, dto.geslacht);
                request.input('Tussenvoegsel', sql.NVarChar, dto.tussenvoegsel);
                request.input('Achternaam', sql.NVarChar, dto.achternaam);
                request.input('Adres', sql.NVarChar, dto.adres);
                request.input('Postcode', sql.NVarChar, dto.postcode);
                request.input('Plaats', sql.NVarChar, dto.plaats);
                request.input('GeboortePlaats', sql.NVarChar, dto.geboorteplaats);
                request.input('GeboorteDatum', sql.Date, dto.geboorte_datum);
                request.input('Nationaliteit1', sql.NVarChar, dto.nationaliteit_1);
                request.input('Nationaliteit2', sql.NVarChar, dto.nationaliteit_2);
                request.input('Telefoon', sql.NVarChar, dto.telefoon);
                request.input('Email', sql.NVarChar, dto.email);
                request.input('Beroep', sql.NVarChar, dto.beroep);

                const result = await request.query(`
                    UPDATE dbo.personen SET
                        voorletters = @Voorletters,
                        voornamen = @Voornamen,
                        roepnaam = @Roepnaam,
                        geslacht = @Geslacht,
                        tussenvoegsel = @Tussenvoegsel,
                        achternaam = @Achternaam,
                        adres = @Adres,
                        postcode = @Postcode,
                        plaats = @Plaats,
                        geboorteplaats = @GeboortePlaats,
                        geboorte_datum = @GeboorteDatum,
                        nationaliteit_1 = @Nationaliteit1,
                        nationaliteit_2 = @Nationaliteit2,
                        telefoon = @Telefoon,
                        email = @Email,
                        beroep = @Beroep
                    OUTPUT INSERTED.*
                    WHERE id = @Id
                `);

                return DbMappers.toPersoon(result.recordset[0]);
            } else {
                // Insert new person
                const request = pool.request();
                request.input('Voorletters', sql.NVarChar, dto.voorletters);
                request.input('Voornamen', sql.NVarChar, dto.voornamen);
                request.input('Roepnaam', sql.NVarChar, dto.roepnaam);
                request.input('Geslacht', sql.NVarChar, dto.geslacht);
                request.input('Tussenvoegsel', sql.NVarChar, dto.tussenvoegsel);
                request.input('Achternaam', sql.NVarChar, dto.achternaam || '');
                request.input('Adres', sql.NVarChar, dto.adres);
                request.input('Postcode', sql.NVarChar, dto.postcode);
                request.input('Plaats', sql.NVarChar, dto.plaats);
                request.input('GeboortePlaats', sql.NVarChar, dto.geboorteplaats);
                request.input('GeboorteDatum', sql.Date, dto.geboorte_datum);
                request.input('Nationaliteit1', sql.NVarChar, dto.nationaliteit_1);
                request.input('Nationaliteit2', sql.NVarChar, dto.nationaliteit_2);
                request.input('Telefoon', sql.NVarChar, dto.telefoon);
                request.input('Email', sql.NVarChar, dto.email);
                request.input('Beroep', sql.NVarChar, dto.beroep);

                const result = await request.query(`
                    INSERT INTO dbo.personen (
                        voorletters, voornamen, roepnaam, geslacht, tussenvoegsel, achternaam,
                        adres, postcode, plaats, geboorteplaats, geboorte_datum,
                        nationaliteit_1, nationaliteit_2, telefoon, email, beroep
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @Voorletters, @Voornamen, @Roepnaam, @Geslacht, @Tussenvoegsel, @Achternaam,
                        @Adres, @Postcode, @Plaats, @GeboortePlaats, @GeboorteDatum,
                        @Nationaliteit1, @Nationaliteit2, @Telefoon, @Email, @Beroep
                    )
                `);

                return DbMappers.toPersoon(result.recordset[0]);
            }
        } catch (error) {
            console.error('Error saving persoon:', error);
            throw error;
        }
    }

    async linkPersoonToDossier(dossierID: number, persoonID: number, rolID: number): Promise<void> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);
            request.input('PersoonID', sql.Int, persoonID);
            request.input('RolID', sql.Int, rolID);

            await request.query(`
                INSERT INTO dbo.dossiers_partijen (dossier_id, persoon_id, rol_id)
                VALUES (@DossierID, @PersoonID, @RolID)
            `);
        } catch (error) {
            console.error('Error linking persoon to dossier:', error);
            throw error;
        }
    }


    async getRollen(): Promise<Rol[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            const result = await request.query(`
                SELECT id, naam 
                FROM dbo.rollen 
                ORDER BY naam
            `);

            return result.recordset.map(row => ({
                id: row.id,
                naam: row.naam
            }));
        } catch (error) {
            console.error('Error getting rollen:', error);
            throw error;
        }
    }

    async getPersoonById(persoonId: number): Promise<Persoon | null> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('PersoonId', sql.Int, persoonId);

            const result = await request.query(`
                SELECT * FROM dbo.personen 
                WHERE id = @PersoonId
            `);

            return result.recordset[0] ? DbMappers.toPersoon(result.recordset[0]) : null;
        } catch (error) {
            console.error('Error getting persoon by ID:', error);
            throw error;
        }
    }

    async checkEmailUnique(email: string, excludePersonId?: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('Email', sql.NVarChar, email);
            
            let query = `
                SELECT COUNT(*) as count 
                FROM dbo.personen 
                WHERE email = @Email
            `;

            if (excludePersonId) {
                request.input('ExcludePersonId', sql.Int, excludePersonId);
                query += ' AND id != @ExcludePersonId';
            }

            const result = await request.query(query);
            return result.recordset[0].count === 0;
        } catch (error) {
            console.error('Error checking email uniqueness:', error);
            throw error;
        }
    }

    async checkPartijExists(dossierId: number, persoonId: number, rolId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);
            request.input('PersoonId', sql.Int, persoonId);
            request.input('RolId', sql.Int, rolId);

            const result = await request.query(`
                SELECT COUNT(*) as count 
                FROM dbo.dossiers_partijen 
                WHERE dossier_id = @DossierId AND persoon_id = @PersoonId AND rol_id = @RolId
            `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking if partij exists:', error);
            throw error;
        }
    }

    async removePartijFromDossier(dossierId: number, partijId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);
            request.input('PartijId', sql.Int, partijId);

            const result = await request.query(`
                DELETE FROM dbo.dossiers_partijen 
                WHERE dossier_id = @DossierId AND id = @PartijId
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error removing partij from dossier:', error);
            throw error;
        }
    }

    async getPartijById(dossierId: number, partijId: number): Promise<{persoon: Persoon, rol: Rol} | null> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);
            request.input('PartijId', sql.Int, partijId);

            const result = await request.query(`
                SELECT 
                    p.*,
                    r.id as rol_id,
                    r.naam as rol_naam
                FROM dbo.dossiers_partijen dp
                JOIN dbo.personen p ON dp.persoon_id = p.id
                JOIN dbo.rollen r ON dp.rol_id = r.id
                WHERE dp.dossier_id = @DossierId AND dp.id = @PartijId
            `);

            if (result.recordset.length === 0) {
                return null;
            }

            const row = result.recordset[0];
            return {
                persoon: DbMappers.toPersoon(row),
                rol: {
                    id: row.rol_id,
                    naam: row.rol_naam
                }
            };
        } catch (error) {
            console.error('Error getting partij by ID:', error);
            throw error;
        }
    }

    async linkPersoonToDossierWithReturn(dossierID: number, persoonID: number, rolID: number): Promise<{id: number, persoon: Persoon, rol: Rol}> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);
            request.input('PersoonID', sql.Int, persoonID);
            request.input('RolID', sql.Int, rolID);

            const result = await request.query(`
                INSERT INTO dbo.dossiers_partijen (dossier_id, persoon_id, rol_id)
                OUTPUT INSERTED.id
                VALUES (@DossierID, @PersoonID, @RolID)
            `);

            const partijId = result.recordset[0].id;

            // Get the complete partij data
            const partijData = await this.getPartijById(dossierID, partijId);
            if (!partijData) {
                throw new Error('Failed to retrieve created partij');
            }

            return {
                id: partijId,
                persoon: partijData.persoon,
                rol: partijData.rol
            };
        } catch (error) {
            console.error('Error linking persoon to dossier:', error);
            throw error;
        }
    }

    async getPartijListWithId(dossierID: number): Promise<Array<{ id: number; persoon: Persoon; rol: Rol }>> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);

            const result = await request.query(`
                SELECT 
                    dp.id as partij_id,
                    p.*,
                    r.id as rol_id,
                    r.naam as rol_naam
                FROM dbo.dossiers_partijen dp
                JOIN dbo.personen p ON dp.persoon_id = p.id
                JOIN dbo.rollen r ON dp.rol_id = r.id
                WHERE dp.dossier_id = @DossierID
                ORDER BY r.id
            `);

            return result.recordset.map(row => ({
                id: row.partij_id,
                persoon: DbMappers.toPersoon(row),
                rol: {
                    id: row.rol_id,
                    naam: row.rol_naam,
                },
            }));
        } catch (error) {
            console.error('Error getting partijen with ID:', error);
            throw error;
        }
    }

    async deletePersoon(persoonId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('PersoonId', sql.Int, persoonId);

            const result = await request.query(`
                DELETE FROM dbo.personen 
                WHERE id = @PersoonId
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting persoon:', error);
            throw error;
        }
    }

    // FASE 3: Kinderen & Ouder-Kind Relaties methods

    async getRelatieTypes(): Promise<RelatieType[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            const result = await request.query(`
                SELECT id, naam 
                FROM dbo.relatie_types 
                ORDER BY naam
            `);

            return result.recordset.map(row => ({
                id: row.id,
                naam: row.naam
            }));
        } catch (error) {
            console.error('Error getting relatie types:', error);
            throw error;
        }
    }

    async checkKindInDossier(dossierId: number, kindId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);
            request.input('KindId', sql.Int, kindId);

            const result = await request.query(`
                SELECT COUNT(*) as count 
                FROM dbo.dossiers_kinderen 
                WHERE dossier_id = @DossierId AND kind_id = @KindId
            `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking kind in dossier:', error);
            throw error;
        }
    }

    async addKindToDossier(dossierId: number, kindId: number): Promise<number> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);
            request.input('KindId', sql.Int, kindId);

            const result = await request.query(`
                INSERT INTO dbo.dossiers_kinderen (dossier_id, kind_id)
                OUTPUT INSERTED.id
                VALUES (@DossierId, @KindId)
            `);

            return result.recordset[0].id;
        } catch (error) {
            console.error('Error adding kind to dossier:', error);
            throw error;
        }
    }

    async removeKindFromDossier(dossierId: number, dossierKindId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);
            request.input('DossierKindId', sql.Int, dossierKindId);

            const result = await request.query(`
                DELETE FROM dbo.dossiers_kinderen 
                WHERE dossier_id = @DossierId AND id = @DossierKindId
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error removing kind from dossier:', error);
            throw error;
        }
    }

    async getOudersByKind(kindId: number): Promise<Array<{id: number, ouder: Persoon, relatieType: RelatieType}>> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('KindId', sql.Int, kindId);

            const result = await request.query(`
                SELECT 
                    ko.id as relatie_id,
                    p.*,
                    rt.id as relatie_type_id,
                    rt.naam as relatie_type_naam
                FROM dbo.kinderen_ouders ko
                JOIN dbo.personen p ON ko.ouder_id = p.id
                JOIN dbo.relatie_types rt ON ko.relatie_type_id = rt.id
                WHERE ko.kind_id = @KindId
                ORDER BY rt.naam, p.achternaam
            `);

            return result.recordset.map(row => ({
                id: row.relatie_id,
                ouder: DbMappers.toPersoon(row),
                relatieType: {
                    id: row.relatie_type_id,
                    naam: row.relatie_type_naam
                }
            }));
        } catch (error) {
            console.error('Error getting ouders by kind:', error);
            throw error;
        }
    }

    async checkOuderKindRelatie(kindId: number, ouderId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('KindId', sql.Int, kindId);
            request.input('OuderId', sql.Int, ouderId);

            const result = await request.query(`
                SELECT COUNT(*) as count 
                FROM dbo.kinderen_ouders 
                WHERE kind_id = @KindId AND ouder_id = @OuderId
            `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking ouder-kind relatie:', error);
            throw error;
        }
    }

    async addOuderToKind(kindId: number, ouderId: number, relatieTypeId: number): Promise<number> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('KindId', sql.Int, kindId);
            request.input('OuderId', sql.Int, ouderId);
            request.input('RelatieTypeId', sql.Int, relatieTypeId);

            const result = await request.query(`
                INSERT INTO dbo.kinderen_ouders (kind_id, ouder_id, relatie_type_id)
                OUTPUT INSERTED.id
                VALUES (@KindId, @OuderId, @RelatieTypeId)
            `);

            return result.recordset[0].id;
        } catch (error) {
            console.error('Error adding ouder to kind:', error);
            throw error;
        }
    }

    async updateOuderKindRelatie(kindId: number, ouderId: number, relatieTypeId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('KindId', sql.Int, kindId);
            request.input('OuderId', sql.Int, ouderId);
            request.input('RelatieTypeId', sql.Int, relatieTypeId);

            const result = await request.query(`
                UPDATE dbo.kinderen_ouders 
                SET relatie_type_id = @RelatieTypeId
                WHERE kind_id = @KindId AND ouder_id = @OuderId
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error updating ouder-kind relatie:', error);
            throw error;
        }
    }

    async removeOuderFromKind(kindId: number, ouderId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('KindId', sql.Int, kindId);
            request.input('OuderId', sql.Int, ouderId);

            const result = await request.query(`
                DELETE FROM dbo.kinderen_ouders 
                WHERE kind_id = @KindId AND ouder_id = @OuderId
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error removing ouder from kind:', error);
            throw error;
        }
    }

    async getKindWithOudersById(dossierKindId: number): Promise<{id: number, kind: Persoon, ouders: Array<{ouder: Persoon, relatieType: RelatieType}>} | null> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierKindId', sql.Int, dossierKindId);

            // First get the kind from dossiers_kinderen
            const kindResult = await request.query(`
                SELECT dk.id as dossier_kind_id, p.*
                FROM dbo.dossiers_kinderen dk
                JOIN dbo.personen p ON dk.kind_id = p.id
                WHERE dk.id = @DossierKindId
            `);

            if (kindResult.recordset.length === 0) {
                return null;
            }

            const kindRow = kindResult.recordset[0];
            const kind = DbMappers.toPersoon(kindRow);

            // Get ouders for this kind
            const ouders = await this.getOudersByKind(kind.id);

            return {
                id: kindRow.dossier_kind_id,
                kind,
                ouders: ouders.map(o => ({
                    ouder: o.ouder,
                    relatieType: o.relatieType
                }))
            };
        } catch (error) {
            console.error('Error getting kind with ouders by ID:', error);
            throw error;
        }
    }

    // FASE 4: Omgang & Zorg methods

    // Lookup methods (with caching)
    async getDagen(): Promise<Dag[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            const result = await request.query(`
                SELECT id, naam 
                FROM dbo.dagen 
                ORDER BY id
            `);

            return result.recordset.map(row => ({
                id: row.id,
                naam: row.naam
            }));
        } catch (error) {
            console.error('Error getting dagen:', error);
            throw error;
        }
    }

    async getDagdelen(): Promise<Dagdeel[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            const result = await request.query(`
                SELECT id, naam 
                FROM dbo.dagdelen 
                ORDER BY id
            `);

            return result.recordset.map(row => ({
                id: row.id,
                naam: row.naam
            }));
        } catch (error) {
            console.error('Error getting dagdelen:', error);
            throw error;
        }
    }

    async getWeekRegelingen(): Promise<WeekRegeling[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            const result = await request.query(`
                SELECT id, omschrijving 
                FROM dbo.week_regelingen 
                ORDER BY id
            `);

            return result.recordset.map(row => ({
                id: row.id,
                omschrijving: row.omschrijving
            }));
        } catch (error) {
            console.error('Error getting week regelingen:', error);
            throw error;
        }
    }

    async getZorgCategorieen(): Promise<ZorgCategorie[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            const result = await request.query(`
                SELECT id, naam 
                FROM dbo.zorg_categorieen 
                ORDER BY naam
            `);

            return result.recordset.map(row => ({
                id: row.id,
                naam: row.naam
            }));
        } catch (error) {
            console.error('Error getting zorg categorieën:', error);
            throw error;
        }
    }

    async getZorgSituaties(categorieId?: number, excludeCategories?: number[]): Promise<ZorgSituatie[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            let query = `
                SELECT id, naam, zorg_categorie_id 
                FROM dbo.zorg_situaties 
            `;

            const conditions = [];

            if (categorieId) {
                conditions.push('zorg_categorie_id = @CategorieId');
                request.input('CategorieId', sql.Int, categorieId);
            }

            if (excludeCategories && excludeCategories.length > 0) {
                // Create parameterized placeholders for each excluded category
                const excludePlaceholders = excludeCategories.map((_, index) => `@ExcludeCategory${index}`).join(', ');
                conditions.push(`zorg_categorie_id NOT IN (${excludePlaceholders})`);
                
                // Add each excluded category as a parameter
                excludeCategories.forEach((categoryId, index) => {
                    request.input(`ExcludeCategory${index}`, sql.Int, categoryId);
                });
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY naam';

            const result = await request.query(query);

            return result.recordset.map(row => ({
                id: row.id,
                naam: row.naam,
                zorgCategorieId: row.zorg_categorie_id
            }));
        } catch (error) {
            console.error('Error getting zorg situaties:', error);
            throw error;
        }
    }

    async getSchoolvakanties(): Promise<Schoolvakantie[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();
            const result = await request.query(`
                SELECT id, naam 
                FROM dbo.schoolvakanties 
                ORDER BY naam
            `);
            return result.recordset.map(row => ({
                id: row.id,
                naam: row.naam
            }));
        } catch (error) {
            console.error('Error getting schoolvakanties:', error);
            throw error;
        }
    }

    async getRegelingenTemplates(filters?: { meervoudKinderen?: boolean; type?: string }): Promise<RegelingTemplate[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();
            
            let query = `
                SELECT id, template_naam, template_tekst, meervoud_kinderen, type 
                FROM dbo.regelingen_templates 
            `;
            
            const whereClauses = [];
            
            if (filters?.meervoudKinderen !== undefined) {
                whereClauses.push('meervoud_kinderen = @MeervoudKinderen');
                request.input('MeervoudKinderen', sql.Bit, filters.meervoudKinderen);
            }
            
            if (filters?.type) {
                whereClauses.push('type = @Type');
                request.input('Type', sql.NVarChar, filters.type);
            }
            
            if (whereClauses.length > 0) {
                query += ' WHERE ' + whereClauses.join(' AND ');
            }
            
            query += ' ORDER BY type, template_naam';
            
            const result = await request.query(query);
            return result.recordset.map(row => ({
                id: row.id,
                templateNaam: row.template_naam,
                templateTekst: row.template_tekst,
                meervoudKinderen: row.meervoud_kinderen,
                type: row.type
            }));
        } catch (error) {
            console.error('Error getting regelingen templates:', error);
            throw error;
        }
    }

    // Omgang CRUD methods
    async getOmgangByDossier(dossierId: number): Promise<Omgang[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);

            const result = await request.query(`
                SELECT 
                    o.id as omgang_id,
                    o.wissel_tijd,
                    o.week_regeling_anders,
                    o.aangemaakt_op,
                    o.gewijzigd_op,
                    d.id as dag_id,
                    d.naam as dag_naam,
                    dd.id as dagdeel_id,
                    dd.naam as dagdeel_naam,
                    p.id as persoon_id,
                    p.voorletters,
                    p.voornamen,
                    p.roepnaam,
                    p.geslacht,
                    p.tussenvoegsel,
                    p.achternaam,
                    p.adres,
                    p.postcode,
                    p.plaats,
                    p.geboorteplaats,
                    p.geboorte_datum,
                    p.nationaliteit_1,
                    p.nationaliteit_2,
                    p.telefoon,
                    p.email,
                    p.beroep,
                    wr.id as week_regeling_id,
                    wr.omschrijving as week_regeling_omschrijving
                FROM dbo.omgang o
                JOIN dbo.dagen d ON o.dag_id = d.id
                JOIN dbo.dagdelen dd ON o.dagdeel_id = dd.id
                JOIN dbo.personen p ON o.verzorger_id = p.id
                JOIN dbo.week_regelingen wr ON o.week_regeling_id = wr.id
                WHERE o.dossier_id = @DossierId
                ORDER BY d.id, dd.id
            `);

            //TODO Pooling verbeteren
            return result.recordset.map(row => ({
                id: row.omgang_id,
                dag: {
                    id: row.dag_id,
                    naam: row.dag_naam
                },
                dagdeel: {
                    id: row.dagdeel_id,
                    naam: row.dagdeel_naam
                },
                verzorger: DbMappers.toPersoon({
                    id: row.persoon_id,
                    voorletters: row.voorletters,
                    voornamen: row.voornamen,
                    roepnaam: row.roepnaam,
                    geslacht: row.geslacht,
                    tussenvoegsel: row.tussenvoegsel,
                    achternaam: row.achternaam,
                    adres: row.adres,
                    postcode: row.postcode,
                    plaats: row.plaats,
                    geboorteplaats: row.geboorteplaats,
                    geboorte_datum: row.geboorte_datum,
                    nationaliteit_1: row.nationaliteit_1,
                    nationaliteit_2: row.nationaliteit_2,
                    telefoon: row.telefoon,
                    email: row.email,
                    beroep: row.beroep
                }),
                wisselTijd: row.wissel_tijd,
                weekRegeling: {
                    id: row.week_regeling_id,
                    omschrijving: row.week_regeling_omschrijving
                },
                weekRegelingAnders: row.week_regeling_anders,
                aangemaaktOp: row.aangemaakt_op,
                gewijzigdOp: row.gewijzigd_op
            }));
        } catch (error) {
            console.error('Error getting omgang by dossier:', error);
            if (error instanceof Error) {
                console.error('SQL Error details:', error.message);
            }
            throw error;
        }
    }

    async createOmgang(data: CreateOmgangDto): Promise<Omgang> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, data.dossierId);
            request.input('DagId', sql.Int, data.dagId);
            request.input('DagdeelId', sql.Int, data.dagdeelId);
            request.input('VerzorgerId', sql.Int, data.verzorgerId);
            request.input('WisselTijd', sql.NVarChar, data.wisselTijd);
            request.input('WeekRegelingId', sql.Int, data.weekRegelingId);
            request.input('WeekRegelingAnders', sql.NVarChar, data.weekRegelingAnders);

            const result = await request.query(`
                INSERT INTO dbo.omgang (
                    dossier_id, dag_id, dagdeel_id, verzorger_id, 
                    wissel_tijd, week_regeling_id, week_regeling_anders
                )
                OUTPUT INSERTED.id
                VALUES (
                    @DossierId, @DagId, @DagdeelId, @VerzorgerId,
                    @WisselTijd, @WeekRegelingId, @WeekRegelingAnders
                )
            `);

            const omgangId = result.recordset[0].id;

            // Get complete omgang data
            const omgangList = await this.getOmgangByDossier(data.dossierId);
           
            const newOmgang = omgangList.find(o => o.id === omgangId);

            if (!newOmgang) {
                console.error(`Failed to find omgang with ID ${omgangId} in list of ${omgangList.length} entries`);
                throw new Error('Failed to retrieve created omgang');
            }

            return newOmgang;
        } catch (error) {
            console.error('Error creating omgang:', error);
            throw error;
        }
    }

    async updateOmgang(omgangId: number, data: UpdateOmgangDto): Promise<Omgang> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            // Build dynamic update query
            const updateFields = [];
            const params: any = { id: omgangId };

            if (data.dagId !== undefined) {
                updateFields.push('dag_id = @DagId');
                params.DagId = data.dagId;
            }
            if (data.dagdeelId !== undefined) {
                updateFields.push('dagdeel_id = @DagdeelId');
                params.DagdeelId = data.dagdeelId;
            }
            if (data.verzorgerId !== undefined) {
                updateFields.push('verzorger_id = @VerzorgerId');
                params.VerzorgerId = data.verzorgerId;
            }
            if (data.wisselTijd !== undefined) {
                updateFields.push('wissel_tijd = @WisselTijd');
                params.WisselTijd = data.wisselTijd;
            }
            if (data.weekRegelingId !== undefined) {
                updateFields.push('week_regeling_id = @WeekRegelingId');
                params.WeekRegelingId = data.weekRegelingId;
            }
            if (data.weekRegelingAnders !== undefined) {
                updateFields.push('week_regeling_anders = @WeekRegelingAnders');
                params.WeekRegelingAnders = data.weekRegelingAnders;
            }

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            // Add gewijzigd_op
            updateFields.push('gewijzigd_op = GETDATE()');

            // Set parameters
            Object.keys(params).forEach(key => {
                request.input(key, params[key]);
            });

            const query = `
                UPDATE dbo.omgang 
                SET ${updateFields.join(', ')}
                OUTPUT INSERTED.dossier_id
                WHERE id = @id
            `;

            const result = await request.query(query);
            
            if (result.recordset.length === 0) {
                console.error(`No omgang found with ID: ${omgangId}`);
                throw new Error('Omgang not found');
            }

            const dossierId = result.recordset[0].dossier_id;

            // Get updated omgang data
            const omgangList = await this.getOmgangByDossier(dossierId);
            const updatedOmgang = omgangList.find(o => o.id === omgangId);

            if (!updatedOmgang) {
                throw new Error('Failed to retrieve updated omgang');
            }

            return updatedOmgang;
        } catch (error) {
            console.error('Error updating omgang:', error);
            throw error;
        }
    }

    async deleteOmgang(omgangId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('OmgangId', sql.Int, omgangId);

            const result = await request.query(`
                DELETE FROM dbo.omgang 
                WHERE id = @OmgangId
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting omgang:', error);
            throw error;
        }
    }

    async checkOmgangAccess(omgangId: number, userId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('OmgangId', sql.Int, omgangId);
            request.input('UserId', sql.Int, userId);

            const result = await request.query(`
                SELECT COUNT(*) as count
                FROM dbo.omgang o
                JOIN dbo.dossiers d ON o.dossier_id = d.id
                WHERE o.id = @OmgangId AND d.gebruiker_id = @UserId
            `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking omgang access:', error);
            throw error;
        }
    }

    async createOmgangBatch(dossierId: number, entries: any[]): Promise<Omgang[]> {
        const pool = await this.getPool();
        const transaction = pool.transaction();
        
        try {
            await transaction.begin();
            
            const createdIds: number[] = [];
            
            for (const entry of entries) {
                const request = transaction.request();
                
                request.input('DossierId', sql.Int, dossierId);
                request.input('DagId', sql.Int, entry.dagId);
                request.input('DagdeelId', sql.Int, entry.dagdeelId);
                request.input('VerzorgerId', sql.Int, entry.verzorgerId);
                request.input('WisselTijd', sql.NVarChar, entry.wisselTijd);
                request.input('WeekRegelingId', sql.Int, entry.weekRegelingId);
                request.input('WeekRegelingAnders', sql.NVarChar, entry.weekRegelingAnders);
                
                const result = await request.query(`
                    INSERT INTO dbo.omgang (
                        dossier_id, dag_id, dagdeel_id, verzorger_id, 
                        wissel_tijd, week_regeling_id, week_regeling_anders
                    )
                    OUTPUT INSERTED.id
                    VALUES (
                        @DossierId, @DagId, @DagdeelId, @VerzorgerId,
                        @WisselTijd, @WeekRegelingId, @WeekRegelingAnders
                    )
                `);
                
                createdIds.push(result.recordset[0].id);
            }
            
            await transaction.commit();
            
            // Get all created omgang records
            const omgangList = await this.getOmgangByDossier(dossierId);
            return omgangList.filter(o => createdIds.includes(o.id));
            
        } catch (error) {
            await transaction.rollback();
            console.error('Error creating omgang batch:', error);
            throw error;
        }
    }

    async upsertOmgangWeek(dossierId: number, weekRegelingId: number, days: any[], weekRegelingAnders?: string): Promise<Omgang[]> {
        const pool = await this.getPool();
        const transaction = pool.transaction();
        
        try {
            await transaction.begin();
            
            // First, delete existing entries for this week
            const deleteRequest = transaction.request();
            deleteRequest.input('DossierId', sql.Int, dossierId);
            deleteRequest.input('WeekRegelingId', sql.Int, weekRegelingId);
            
            await deleteRequest.query(`
                DELETE FROM dbo.omgang 
                WHERE dossier_id = @DossierId 
                AND week_regeling_id = @WeekRegelingId
            `);
            
            // Then insert new entries
            const createdIds: number[] = [];
            
            for (const day of days) {
                // Each day can have multiple dagdelen (parts of day)
                for (const dagdeel of day.dagdelen) {
                    const request = transaction.request();
                    
                    request.input('DossierId', sql.Int, dossierId);
                    request.input('DagId', sql.Int, day.dagId);
                    request.input('DagdeelId', sql.Int, dagdeel.dagdeelId);
                    request.input('VerzorgerId', sql.Int, dagdeel.verzorgerId);
                    request.input('WisselTijd', sql.NVarChar, day.wisselTijd || null);
                    request.input('WeekRegelingId', sql.Int, weekRegelingId);
                    request.input('WeekRegelingAnders', sql.NVarChar, weekRegelingAnders || null);
                    
                    const result = await request.query(`
                        INSERT INTO dbo.omgang (
                            dossier_id, dag_id, dagdeel_id, verzorger_id, 
                            wissel_tijd, week_regeling_id, week_regeling_anders
                        )
                        OUTPUT INSERTED.id
                        VALUES (
                            @DossierId, @DagId, @DagdeelId, @VerzorgerId,
                            @WisselTijd, @WeekRegelingId, @WeekRegelingAnders
                        )
                    `);
                    
                    createdIds.push(result.recordset[0].id);
                }
            }
            
            await transaction.commit();
            
            // Get all created omgang records
            const omgangList = await this.getOmgangByDossier(dossierId);
            return omgangList.filter(o => createdIds.includes(o.id));
            
        } catch (error) {
            await transaction.rollback();
            console.error('Error upserting omgang week:', error);
            throw error;
        }
    }

    async getOmgangByWeek(dossierId: number, weekRegelingId: number): Promise<Omgang[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);
            request.input('WeekRegelingId', sql.Int, weekRegelingId);

            const result = await request.query(`
                SELECT 
                    o.id as omgang_id,
                    o.wissel_tijd,
                    o.week_regeling_anders,
                    o.aangemaakt_op,
                    o.gewijzigd_op,
                    d.id as dag_id,
                    d.naam as dag_naam,
                    dd.id as dagdeel_id,
                    dd.naam as dagdeel_naam,
                    p.id as verzorger_id,
                    p.voorletters as verzorger_voorletters,
                    p.voornamen as verzorger_voornamen,
                    p.roepnaam as verzorger_roepnaam,
                    p.geslacht as verzorger_geslacht,
                    p.tussenvoegsel as verzorger_tussenvoegsel,
                    p.achternaam as verzorger_achternaam,
                    p.adres as verzorger_adres,
                    p.postcode as verzorger_postcode,
                    p.plaats as verzorger_plaats,
                    p.geboorteplaats as verzorger_geboorteplaats,
                    p.geboorte_datum as verzorger_geboorte_datum,
                    p.nationaliteit_1 as verzorger_nationaliteit_1,
                    p.nationaliteit_2 as verzorger_nationaliteit_2,
                    p.telefoon as verzorger_telefoon,
                    p.email as verzorger_email,
                    p.beroep as verzorger_beroep,
                    wr.id as week_regeling_id,
                    wr.omschrijving as week_regeling_omschrijving
                FROM dbo.omgang o
                JOIN dbo.dagen d ON o.dag_id = d.id
                JOIN dbo.dagdelen dd ON o.dagdeel_id = dd.id
                JOIN dbo.personen p ON o.verzorger_id = p.id
                JOIN dbo.week_regelingen wr ON o.week_regeling_id = wr.id
                WHERE o.dossier_id = @DossierId
                AND o.week_regeling_id = @WeekRegelingId
                ORDER BY d.id, dd.id
            `);

            return result.recordset.map(row => ({
                id: row.omgang_id,
                dag: {
                    id: row.dag_id,
                    naam: row.dag_naam
                },
                dagdeel: {
                    id: row.dagdeel_id,
                    naam: row.dagdeel_naam
                },
                verzorger: {
                    id: row.verzorger_id,
                    voorletters: row.verzorger_voorletters,
                    voornamen: row.verzorger_voornamen,
                    roepnaam: row.verzorger_roepnaam,
                    geslacht: row.verzorger_geslacht,
                    tussenvoegsel: row.verzorger_tussenvoegsel,
                    achternaam: row.verzorger_achternaam,
                    adres: row.verzorger_adres,
                    postcode: row.verzorger_postcode,
                    plaats: row.verzorger_plaats,
                    geboortePlaats: row.verzorger_geboorteplaats,
                    geboorteDatum: row.verzorger_geboorte_datum,
                    nationaliteit1: row.verzorger_nationaliteit_1,
                    nationaliteit2: row.verzorger_nationaliteit_2,
                    telefoon: row.verzorger_telefoon,
                    email: row.verzorger_email,
                    beroep: row.verzorger_beroep
                },
                wisselTijd: row.wissel_tijd,
                weekRegeling: {
                    id: row.week_regeling_id,
                    omschrijving: row.week_regeling_omschrijving
                },
                weekRegelingAnders: row.week_regeling_anders,
                aangemaaktOp: row.aangemaakt_op,
                gewijzigdOp: row.gewijzigd_op
            }));
        } catch (error) {
            console.error('Error getting omgang by week:', error);
            throw error;
        }
    }

    // Zorg CRUD methods
    async getZorgByDossier(dossierId: number): Promise<Zorg[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);

            const result = await request.query(`
                SELECT 
                    z.id,
                    z.situatie_anders,
                    z.overeenkomst,
                    z.aangemaakt_op,
                    z.aangemaakt_door,
                    z.gewijzigd_op,
                    z.gewijzigd_door,
                    zc.id as zorg_categorie_id,
                    zc.naam as zorg_categorie_naam,
                    zs.id as zorg_situatie_id,
                    zs.naam as zorg_situatie_naam
                FROM dbo.zorg z
                JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
                JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
                WHERE z.dossier_id = @DossierId
                ORDER BY z.aangemaakt_op DESC
            `);

            return result.recordset.map(row => ({
                id: row.id,
                zorgCategorie: {
                    id: row.zorg_categorie_id,
                    naam: row.zorg_categorie_naam
                },
                zorgSituatie: {
                    id: row.zorg_situatie_id,
                    naam: row.zorg_situatie_naam,
                    zorgCategorieId: row.zorg_categorie_id
                },
                situatieAnders: row.situatie_anders,
                overeenkomst: row.overeenkomst,
                aangemaaktOp: row.aangemaakt_op,
                aangemaaktDoor: row.aangemaakt_door,
                gewijzigdOp: row.gewijzigd_op,
                gewijzigdDoor: row.gewijzigd_door
            }));
        } catch (error) {
            console.error('Error getting zorg by dossier:', error);
            throw error;
        }
    }

    async getZorgByDossierAndCategorie(dossierId: number, zorgCategorieId: number): Promise<Zorg[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);
            request.input('ZorgCategorieId', sql.Int, zorgCategorieId);

            const result = await request.query(`
                SELECT 
                    z.id,
                    z.situatie_anders,
                    z.overeenkomst,
                    z.aangemaakt_op,
                    z.aangemaakt_door,
                    z.gewijzigd_op,
                    z.gewijzigd_door,
                    zc.id as zorg_categorie_id,
                    zc.naam as zorg_categorie_naam,
                    zs.id as zorg_situatie_id,
                    zs.naam as zorg_situatie_naam
                FROM dbo.zorg z
                JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
                JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
                WHERE z.dossier_id = @DossierId AND z.zorg_categorie_id = @ZorgCategorieId
                ORDER BY z.aangemaakt_op DESC
            `);

            return result.recordset.map(row => ({
                id: row.id,
                zorgCategorie: {
                    id: row.zorg_categorie_id,
                    naam: row.zorg_categorie_naam
                },
                zorgSituatie: {
                    id: row.zorg_situatie_id,
                    naam: row.zorg_situatie_naam,
                    zorgCategorieId: row.zorg_categorie_id
                },
                situatieAnders: row.situatie_anders,
                overeenkomst: row.overeenkomst,
                aangemaaktOp: row.aangemaakt_op,
                aangemaaktDoor: row.aangemaakt_door,
                gewijzigdOp: row.gewijzigd_op,
                gewijzigdDoor: row.gewijzigd_door
            }));
        } catch (error) {
            console.error('Error getting zorg by dossier and categorie:', error);
            throw error;
        }
    }

    async createZorg(data: CreateZorgDto & {aangemaaktDoor: number}): Promise<Zorg> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, data.dossierId);
            request.input('ZorgCategorieId', sql.Int, data.zorgCategorieId);
            request.input('ZorgSituatieId', sql.Int, data.zorgSituatieId);
            request.input('SituatieAnders', sql.NVarChar, data.situatieAnders);
            request.input('Overeenkomst', sql.NVarChar, data.overeenkomst);
            request.input('AangemaaktDoor', sql.Int, data.aangemaaktDoor);

            const result = await request.query(`
                INSERT INTO dbo.zorg (
                    dossier_id, zorg_categorie_id, zorg_situatie_id,
                    situatie_anders, overeenkomst, aangemaakt_door
                )
                OUTPUT INSERTED.id
                VALUES (
                    @DossierId, @ZorgCategorieId, @ZorgSituatieId,
                    @SituatieAnders, @Overeenkomst, @AangemaaktDoor
                )
            `);

            const zorgId = result.recordset[0].id;

            // Get complete zorg data
            const zorgList = await this.getZorgByDossier(data.dossierId);
            const newZorg = zorgList.find(z => z.id === zorgId);

            if (!newZorg) {
                throw new Error('Failed to retrieve created zorg');
            }

            return newZorg;
        } catch (error) {
            console.error('Error creating zorg:', error);
            throw error;
        }
    }

    async updateZorg(zorgId: number, data: UpdateZorgDto & {gewijzigdDoor: number}): Promise<Zorg> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            // Build dynamic update query
            const updateFields = [];
            const params: any = { id: zorgId, gewijzigdDoor: data.gewijzigdDoor };

            if (data.zorgCategorieId !== undefined) {
                updateFields.push('zorg_categorie_id = @ZorgCategorieId');
                params.ZorgCategorieId = data.zorgCategorieId;
            }
            if (data.zorgSituatieId !== undefined) {
                updateFields.push('zorg_situatie_id = @ZorgSituatieId');
                params.ZorgSituatieId = data.zorgSituatieId;
            }
            if (data.situatieAnders !== undefined) {
                updateFields.push('situatie_anders = @SituatieAnders');
                params.SituatieAnders = data.situatieAnders;
            }
            if (data.overeenkomst !== undefined) {
                updateFields.push('overeenkomst = @Overeenkomst');
                params.Overeenkomst = data.overeenkomst;
            }

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            // Add gewijzigd fields
            updateFields.push('gewijzigd_op = GETDATE()');
            updateFields.push('gewijzigd_door = @gewijzigdDoor');

            // Set parameters
            Object.keys(params).forEach(key => {
                request.input(key, params[key]);
            });

            const query = `
                UPDATE dbo.zorg 
                SET ${updateFields.join(', ')}
                OUTPUT INSERTED.dossier_id
                WHERE id = @id
            `;

            const result = await request.query(query);
            if (result.recordset.length === 0) {
                throw new Error('Zorg not found');
            }

            const dossierId = result.recordset[0].dossier_id;

            // Get updated zorg data
            const zorgList = await this.getZorgByDossier(dossierId);
            const updatedZorg = zorgList.find(z => z.id === zorgId);

            if (!updatedZorg) {
                throw new Error('Failed to retrieve updated zorg');
            }

            return updatedZorg;
        } catch (error) {
            console.error('Error updating zorg:', error);
            throw error;
        }
    }

    async deleteZorg(zorgId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('ZorgId', sql.Int, zorgId);

            const result = await request.query(`
                DELETE FROM dbo.zorg 
                WHERE id = @ZorgId
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting zorg:', error);
            throw error;
        }
    }

    async checkZorgAccess(zorgId: number, userId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('ZorgId', sql.Int, zorgId);
            request.input('UserId', sql.Int, userId);

            const result = await request.query(`
                SELECT COUNT(*) as count
                FROM dbo.zorg z
                JOIN dbo.dossiers d ON z.dossier_id = d.id
                WHERE z.id = @ZorgId AND d.gebruiker_id = @UserId
            `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking zorg access:', error);
            throw error;
        }
    }

    // Alternative method to get personen via dossier relationships
    async getAllPersonenForUserViaDossiers(userId: number, limit: number, offset: number): Promise<{ data: Persoon[], total: number }> {
        try {
            const pool = await this.getPool();

            // Get count of unique persons linked to user's dossiers
            const countRequest = pool.request();
            countRequest.input('UserId', sql.Int, userId);
            const countResult = await countRequest.query(`
                SELECT COUNT(DISTINCT p.id) as total
                FROM dbo.personen p
                INNER JOIN dbo.dossiers_partijen dp ON p.id = dp.persoon_id
                INNER JOIN dbo.dossiers d ON dp.dossier_id = d.id
                WHERE d.gebruiker_id = @UserId
            `);
            const total = countResult.recordset[0].total;

            // Get paginated data
            const dataRequest = pool.request();
            dataRequest.input('UserId', sql.Int, userId);
            dataRequest.input('Limit', sql.Int, limit);
            dataRequest.input('Offset', sql.Int, offset);

            const result = await dataRequest.query(`
                SELECT DISTINCT
                    p.id,
                    p.voorletters,
                    p.voornamen,
                    p.roepnaam,
                    p.geslacht,
                    p.tussenvoegsel,
                    p.achternaam,
                    p.adres,
                    p.postcode,
                    p.plaats,
                    p.geboorteplaats,
                    p.geboorte_datum,
                    p.nationaliteit_1,
                    p.nationaliteit_2,
                    p.telefoon,
                    p.email,
                    p.beroep
                FROM dbo.personen p
                INNER JOIN dbo.dossiers_partijen dp ON p.id = dp.persoon_id
                INNER JOIN dbo.dossiers d ON dp.dossier_id = d.id
                WHERE d.gebruiker_id = @UserId
                ORDER BY p.achternaam, p.voornamen
                OFFSET @Offset ROWS
                FETCH NEXT @Limit ROWS ONLY
            `);

            return {
                data: result.recordset.map(row => DbMappers.toPersoon(row)),
                total
            };
        } catch (error) {
            console.error('Error in getAllPersonenForUserViaDossiers:', error);
            throw new Error('Failed to fetch personen via dossiers');
        }
    }

    // Personen methods - User-scoped versions
    async getAllPersonenForUser(userId: number, limit: number, offset: number): Promise<{ data: Persoon[], total: number }> {
        try {
            const pool = await this.getPool();

            // Get total count for this user
            const countRequest = pool.request();
            countRequest.input('UserId', sql.Int, userId);
            const countResult = await countRequest.query(`
                SELECT COUNT(*) as total FROM dbo.personen
                WHERE gebruiker_id = @UserId
            `);
            const total = countResult.recordset[0].total;

            // Get paginated data for this user
            const dataRequest = pool.request();
            dataRequest.input('UserId', sql.Int, userId);
            dataRequest.input('Limit', sql.Int, limit);
            dataRequest.input('Offset', sql.Int, offset);

            const result = await dataRequest.query(`
                SELECT 
                    id,
                    voorletters,
                    voornamen,
                    roepnaam,
                    geslacht,
                    tussenvoegsel,
                    achternaam,
                    adres,
                    postcode,
                    plaats,
                    geboorteplaats,
                    geboorte_datum,
                    nationaliteit_1,
                    nationaliteit_2,
                    telefoon,
                    email,
                    beroep
                FROM dbo.personen
                WHERE gebruiker_id = @UserId
                ORDER BY achternaam, voornamen
                OFFSET @Offset ROWS
                FETCH NEXT @Limit ROWS ONLY
            `);

            return {
                data: result.recordset.map(row => DbMappers.toPersoon(row)),
                total
            };
        } catch (error) {
            console.error('Error in getAllPersonenForUser:', error);
            throw new Error('Failed to fetch personen');
        }
    }

    async getPersoonByIdForUser(persoonId: number, userId: number): Promise<Persoon | null> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('PersoonId', sql.Int, persoonId);
            request.input('UserId', sql.Int, userId);

            const result = await request.query(`
                SELECT * FROM dbo.personen 
                WHERE id = @PersoonId AND gebruiker_id = @UserId
            `);

            return result.recordset.length > 0 
                ? DbMappers.toPersoon(result.recordset[0])
                : null;
        } catch (error) {
            console.error('Error in getPersoonByIdForUser:', error);
            throw new Error('Failed to fetch persoon');
        }
    }

    async createOrUpdatePersoonForUser(persoonData: Partial<Persoon>, userId: number): Promise<Persoon> {
        try {
            const pool = await this.getPool();
            const dto = DbMappers.toPersoonDto(persoonData as Persoon);

            if (persoonData.id) {
                // Update existing person (verify it belongs to user)
                const request = pool.request();
                request.input('Id', sql.Int, persoonData.id);
                request.input('UserId', sql.Int, userId);
                request.input('Voorletters', sql.NVarChar, dto.voorletters);
                request.input('Voornamen', sql.NVarChar, dto.voornamen);
                request.input('Roepnaam', sql.NVarChar, dto.roepnaam);
                request.input('Geslacht', sql.NVarChar, dto.geslacht);
                request.input('Tussenvoegsel', sql.NVarChar, dto.tussenvoegsel);
                request.input('Achternaam', sql.NVarChar, dto.achternaam);
                request.input('Adres', sql.NVarChar, dto.adres);
                request.input('Postcode', sql.NVarChar, dto.postcode);
                request.input('Plaats', sql.NVarChar, dto.plaats);
                request.input('Geboorteplaats', sql.NVarChar, dto.geboorteplaats);
                request.input('Geboortedatum', sql.Date, dto.geboorte_datum ? new Date(dto.geboorte_datum) : null);
                request.input('Nationaliteit_1', sql.NVarChar, dto.nationaliteit_1);
                request.input('Nationaliteit_2', sql.NVarChar, dto.nationaliteit_2);
                request.input('Telefoon', sql.NVarChar, dto.telefoon);
                request.input('Email', sql.NVarChar, dto.email);
                request.input('Beroep', sql.NVarChar, dto.beroep);

                const result = await request.query(`
                    UPDATE dbo.personen
                    SET 
                        voorletters = @Voorletters,
                        voornamen = @Voornamen,
                        roepnaam = @Roepnaam,
                        geslacht = @Geslacht,
                        tussenvoegsel = @Tussenvoegsel,
                        achternaam = @Achternaam,
                        adres = @Adres,
                        postcode = @Postcode,
                        plaats = @Plaats,
                        geboorteplaats = @Geboorteplaats,
                        geboorte_datum = @Geboortedatum,
                        nationaliteit_1 = @Nationaliteit_1,
                        nationaliteit_2 = @Nationaliteit_2,
                        telefoon = @Telefoon,
                        email = @Email,
                        beroep = @Beroep
                    OUTPUT INSERTED.*
                    WHERE id = @Id AND gebruiker_id = @UserId
                `);

                if (result.recordset.length === 0) {
                    throw new Error('Person not found or access denied');
                }

                return DbMappers.toPersoon(result.recordset[0]);
            } else {
                // Create new person with gebruiker_id
                const request = pool.request();
                request.input('UserId', sql.Int, userId);
                request.input('Voorletters', sql.NVarChar, dto.voorletters);
                request.input('Voornamen', sql.NVarChar, dto.voornamen);
                request.input('Roepnaam', sql.NVarChar, dto.roepnaam);
                request.input('Geslacht', sql.NVarChar, dto.geslacht);
                request.input('Tussenvoegsel', sql.NVarChar, dto.tussenvoegsel);
                request.input('Achternaam', sql.NVarChar, dto.achternaam);
                request.input('Adres', sql.NVarChar, dto.adres);
                request.input('Postcode', sql.NVarChar, dto.postcode);
                request.input('Plaats', sql.NVarChar, dto.plaats);
                request.input('Geboorteplaats', sql.NVarChar, dto.geboorteplaats);
                request.input('Geboortedatum', sql.Date, dto.geboorte_datum ? new Date(dto.geboorte_datum) : null);
                request.input('Nationaliteit_1', sql.NVarChar, dto.nationaliteit_1);
                request.input('Nationaliteit_2', sql.NVarChar, dto.nationaliteit_2);
                request.input('Telefoon', sql.NVarChar, dto.telefoon);
                request.input('Email', sql.NVarChar, dto.email);
                request.input('Beroep', sql.NVarChar, dto.beroep);

                const result = await request.query(`
                    INSERT INTO dbo.personen (
                        gebruiker_id,
                        voorletters,
                        voornamen,
                        roepnaam,
                        geslacht,
                        tussenvoegsel,
                        achternaam,
                        adres,
                        postcode,
                        plaats,
                        geboorteplaats,
                        geboorte_datum,
                        nationaliteit_1,
                        nationaliteit_2,
                        telefoon,
                        email,
                        beroep
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @UserId,
                        @Voorletters,
                        @Voornamen,
                        @Roepnaam,
                        @Geslacht,
                        @Tussenvoegsel,
                        @Achternaam,
                        @Adres,
                        @Postcode,
                        @Plaats,
                        @Geboorteplaats,
                        @Geboortedatum,
                        @Nationaliteit_1,
                        @Nationaliteit_2,
                        @Telefoon,
                        @Email,
                        @Beroep
                    )
                `);

                return DbMappers.toPersoon(result.recordset[0]);
            }
        } catch (error) {
            console.error('Error in createOrUpdatePersoonForUser:', error);
            throw new Error('Failed to create or update persoon');
        }
    }

    async updatePersoonForUser(persoonData: Partial<Persoon>, userId: number): Promise<Persoon> {
        return this.createOrUpdatePersoonForUser(persoonData, userId);
    }

    async checkEmailUniqueForUser(email: string, userId: number, excludePersonId?: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('Email', sql.NVarChar, email);
            request.input('UserId', sql.Int, userId);
            
            let query = `
                SELECT COUNT(*) as count 
                FROM dbo.personen 
                WHERE email = @Email AND gebruiker_id = @UserId
            `;

            if (excludePersonId) {
                request.input('ExcludeId', sql.Int, excludePersonId);
                query += ' AND id != @ExcludeId';
            }

            const result = await request.query(query);
            return result.recordset[0].count === 0;
        } catch (error) {
            console.error('Error in checkEmailUniqueForUser:', error);
            throw new Error('Failed to check email uniqueness');
        }
    }

    async deletePersoonForUser(persoonId: number, userId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('PersoonId', sql.Int, persoonId);
            request.input('UserId', sql.Int, userId);

            const result = await request.query(`
                DELETE FROM dbo.personen 
                WHERE id = @PersoonId AND gebruiker_id = @UserId
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error in deletePersoonForUser:', error);
            throw new Error('Failed to delete persoon');
        }
    }

    // Personen methods - Legacy (to be removed after migration)
    async getAllPersonen(limit: number, offset: number): Promise<{ data: Persoon[], total: number }> {
        try {
            const pool = await this.getPool();
            
            // Get total count
            const countRequest = pool.request();
            const countResult = await countRequest.query(`
                SELECT COUNT(*) as total FROM dbo.personen
            `);
            const total = countResult.recordset[0].total;

            // Get paginated data
            const dataRequest = pool.request();
            dataRequest.input('Limit', sql.Int, limit);
            dataRequest.input('Offset', sql.Int, offset);

            const result = await dataRequest.query(`
                SELECT 
                    id,
                    voorletters,
                    voornamen,
                    roepnaam,
                    geslacht,
                    tussenvoegsel,
                    achternaam,
                    adres,
                    postcode,
                    plaats,
                    geboorteplaats,
                    geboorte_datum,
                    nationaliteit_1,
                    nationaliteit_2,
                    telefoon,
                    email,
                    beroep
                FROM dbo.personen
                ORDER BY achternaam, voornamen
                OFFSET @Offset ROWS
                FETCH NEXT @Limit ROWS ONLY
            `);

            const personen = result.recordset.map(row => DbMappers.toPersoon(row));

            return {
                data: personen,
                total: total
            };
        } catch (error) {
            console.error('Error getting all personen:', error);
            throw error;
        }
    }

    // Ouderschapsplan Info methods
    async createOuderschapsplanInfo(dto: CreateOuderschapsplanInfoDto): Promise<OuderschapsplanInfo> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dto.dossierId);
            request.input('Partij1PersoonId', sql.Int, dto.partij1PersoonId);
            request.input('Partij2PersoonId', sql.Int, dto.partij2PersoonId);
            request.input('SoortRelatie', sql.NVarChar, dto.soortRelatie);
            request.input('SoortRelatieVerbreking', sql.NVarChar, dto.soortRelatieVerbreking);
            request.input('BetrokkenheidKind', sql.NVarChar, dto.betrokkenheidKind);
            request.input('Kiesplan', sql.NVarChar, dto.kiesplan);
            request.input('GezagPartij', sql.TinyInt, dto.gezagPartij);
            request.input('WaOpNaamVanPartij', sql.TinyInt, dto.waOpNaamVanPartij);
            request.input('KeuzeDevices', sql.NVarChar, dto.keuzeDevices);
            request.input('ZorgverzekeringOpNaamVanPartij', sql.TinyInt, dto.zorgverzekeringOpNaamVanPartij);
            request.input('KinderbijslagPartij', sql.TinyInt, dto.kinderbijslagPartij);
            request.input('BrpPartij1', sql.NVarChar, dto.brpPartij1 ? JSON.stringify(dto.brpPartij1) : null);
            request.input('BrpPartij2', sql.NVarChar, dto.brpPartij2 ? JSON.stringify(dto.brpPartij2) : null);
            request.input('KgbPartij1', sql.NVarChar, dto.kgbPartij1 ? JSON.stringify(dto.kgbPartij1) : null);
            request.input('KgbPartij2', sql.NVarChar, dto.kgbPartij2 ? JSON.stringify(dto.kgbPartij2) : null);
            request.input('Hoofdverblijf', sql.NVarChar, dto.hoofdverblijf);
            request.input('Zorgverdeling', sql.NVarChar, dto.zorgverdeling);
            request.input('OpvangKinderen', sql.NVarChar, dto.opvangKinderen);
            request.input('Bankrekeningnummers', sql.NVarChar, dto.bankrekeningnummersOpNaamVanKind);
            request.input('ParentingCoordinator', sql.NVarChar, dto.parentingCoordinator);

            const result = await request.query(`
                INSERT INTO dbo.ouderschapsplan_info (
                    dossier_id,
                    partij_1_persoon_id,
                    partij_2_persoon_id,
                    soort_relatie,
                    soort_relatie_verbreking,
                    betrokkenheid_kind,
                    kiesplan,
                    gezag_partij,
                    wa_op_naam_van_partij,
                    keuze_devices,
                    zorgverzekering_op_naam_van_partij,
                    kinderbijslag_partij,
                    brp_partij_1,
                    brp_partij_2,
                    kgb_partij_1,
                    kgb_partij_2,
                    hoofdverblijf,
                    zorgverdeling,
                    opvang_kinderen,
                    bankrekeningnummers_op_naam_van_kind,
                    parenting_coordinator
                )
                OUTPUT INSERTED.*
                VALUES (
                    @DossierId,
                    @Partij1PersoonId,
                    @Partij2PersoonId,
                    @SoortRelatie,
                    @SoortRelatieVerbreking,
                    @BetrokkenheidKind,
                    @Kiesplan,
                    @GezagPartij,
                    @WaOpNaamVanPartij,
                    @KeuzeDevices,
                    @ZorgverzekeringOpNaamVanPartij,
                    @KinderbijslagPartij,
                    @BrpPartij1,
                    @BrpPartij2,
                    @KgbPartij1,
                    @KgbPartij2,
                    @Hoofdverblijf,
                    @Zorgverdeling,
                    @OpvangKinderen,
                    @Bankrekeningnummers,
                    @ParentingCoordinator
                )
            `);

            return DbMappers.toOuderschapsplanInfo(result.recordset[0]);
        } catch (error) {
            console.error('Error creating ouderschapsplan info:', error);
            throw error;
        }
    }

    async getOuderschapsplanInfoById(id: number): Promise<OuderschapsplanInfo | null> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('Id', sql.Int, id);

            const result = await request.query(`
                SELECT * FROM dbo.ouderschapsplan_info 
                WHERE id = @Id
            `);

            return result.recordset[0] ? DbMappers.toOuderschapsplanInfo(result.recordset[0]) : null;
        } catch (error) {
            console.error('Error getting ouderschapsplan info by ID:', error);
            throw error;
        }
    }

    async getOuderschapsplanInfoByPersoonId(persoonId: number): Promise<OuderschapsplanInfo[]> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('PersoonId', sql.Int, persoonId);

            const result = await request.query(`
                SELECT * FROM dbo.ouderschapsplan_info 
                WHERE partij_1_persoon_id = @PersoonId 
                   OR partij_2_persoon_id = @PersoonId
                ORDER BY updated_at DESC
            `);

            return result.recordset.map(DbMappers.toOuderschapsplanInfo);
        } catch (error) {
            console.error('Error getting ouderschapsplan info by persoon ID:', error);
            throw error;
        }
    }

    async getOuderschapsplanInfoByDossierId(dossierId: number): Promise<OuderschapsplanInfo | null> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('DossierId', sql.Int, dossierId);

            const result = await request.query(`
                SELECT * FROM dbo.ouderschapsplan_info 
                WHERE dossier_id = @DossierId
            `);

            return result.recordset[0] ? DbMappers.toOuderschapsplanInfo(result.recordset[0]) : null;
        } catch (error) {
            console.error('Error getting ouderschapsplan info by dossier ID:', error);
            throw error;
        }
    }

    async updateOuderschapsplanInfo(id: number, dto: UpdateOuderschapsplanInfoDto): Promise<OuderschapsplanInfo> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('Id', sql.Int, id);

            const updateFields: string[] = [];
            
            if (dto.dossierId !== undefined) {
                request.input('DossierId', sql.Int, dto.dossierId);
                updateFields.push('dossier_id = @DossierId');
            }
            if (dto.partij1PersoonId !== undefined) {
                request.input('Partij1PersoonId', sql.Int, dto.partij1PersoonId);
                updateFields.push('partij_1_persoon_id = @Partij1PersoonId');
            }
            if (dto.partij2PersoonId !== undefined) {
                request.input('Partij2PersoonId', sql.Int, dto.partij2PersoonId);
                updateFields.push('partij_2_persoon_id = @Partij2PersoonId');
            }
            if (dto.soortRelatie !== undefined) {
                request.input('SoortRelatie', sql.NVarChar, dto.soortRelatie);
                updateFields.push('soort_relatie = @SoortRelatie');
            }
            if (dto.soortRelatieVerbreking !== undefined) {
                request.input('SoortRelatieVerbreking', sql.NVarChar, dto.soortRelatieVerbreking);
                updateFields.push('soort_relatie_verbreking = @SoortRelatieVerbreking');
            }
            if (dto.betrokkenheidKind !== undefined) {
                request.input('BetrokkenheidKind', sql.NVarChar, dto.betrokkenheidKind);
                updateFields.push('betrokkenheid_kind = @BetrokkenheidKind');
            }
            if (dto.kiesplan !== undefined) {
                request.input('Kiesplan', sql.NVarChar, dto.kiesplan);
                updateFields.push('kiesplan = @Kiesplan');
            }
            if (dto.gezagPartij !== undefined) {
                request.input('GezagPartij', sql.TinyInt, dto.gezagPartij);
                updateFields.push('gezag_partij = @GezagPartij');
            }
            if (dto.waOpNaamVanPartij !== undefined) {
                request.input('WaOpNaamVanPartij', sql.TinyInt, dto.waOpNaamVanPartij);
                updateFields.push('wa_op_naam_van_partij = @WaOpNaamVanPartij');
            }
            if (dto.keuzeDevices !== undefined) {
                request.input('KeuzeDevices', sql.NVarChar, dto.keuzeDevices);
                updateFields.push('keuze_devices = @KeuzeDevices');
            }
            if (dto.zorgverzekeringOpNaamVanPartij !== undefined) {
                request.input('ZorgverzekeringOpNaamVanPartij', sql.TinyInt, dto.zorgverzekeringOpNaamVanPartij);
                updateFields.push('zorgverzekering_op_naam_van_partij = @ZorgverzekeringOpNaamVanPartij');
            }
            if (dto.kinderbijslagPartij !== undefined) {
                request.input('KinderbijslagPartij', sql.TinyInt, dto.kinderbijslagPartij);
                updateFields.push('kinderbijslag_partij = @KinderbijslagPartij');
            }
            if (dto.brpPartij1 !== undefined) {
                request.input('BrpPartij1', sql.NVarChar, dto.brpPartij1 ? JSON.stringify(dto.brpPartij1) : null);
                updateFields.push('brp_partij_1 = @BrpPartij1');
            }
            if (dto.brpPartij2 !== undefined) {
                request.input('BrpPartij2', sql.NVarChar, dto.brpPartij2 ? JSON.stringify(dto.brpPartij2) : null);
                updateFields.push('brp_partij_2 = @BrpPartij2');
            }
            if (dto.kgbPartij1 !== undefined) {
                request.input('KgbPartij1', sql.NVarChar, dto.kgbPartij1 ? JSON.stringify(dto.kgbPartij1) : null);
                updateFields.push('kgb_partij_1 = @KgbPartij1');
            }
            if (dto.kgbPartij2 !== undefined) {
                request.input('KgbPartij2', sql.NVarChar, dto.kgbPartij2 ? JSON.stringify(dto.kgbPartij2) : null);
                updateFields.push('kgb_partij_2 = @KgbPartij2');
            }
            if (dto.hoofdverblijf !== undefined) {
                request.input('Hoofdverblijf', sql.NVarChar, dto.hoofdverblijf);
                updateFields.push('hoofdverblijf = @Hoofdverblijf');
            }
            if (dto.zorgverdeling !== undefined) {
                request.input('Zorgverdeling', sql.NVarChar, dto.zorgverdeling);
                updateFields.push('zorgverdeling = @Zorgverdeling');
            }
            if (dto.opvangKinderen !== undefined) {
                request.input('OpvangKinderen', sql.NVarChar, dto.opvangKinderen);
                updateFields.push('opvang_kinderen = @OpvangKinderen');
            }
            if (dto.bankrekeningnummersOpNaamVanKind !== undefined) {
                request.input('Bankrekeningnummers', sql.NVarChar, dto.bankrekeningnummersOpNaamVanKind);
                updateFields.push('bankrekeningnummers_op_naam_van_kind = @Bankrekeningnummers');
            }
            if (dto.parentingCoordinator !== undefined) {
                request.input('ParentingCoordinator', sql.NVarChar, dto.parentingCoordinator);
                updateFields.push('parenting_coordinator = @ParentingCoordinator');
            }

            updateFields.push('updated_at = GETDATE()');

            if (updateFields.length === 1) {
                throw new Error('No fields to update');
            }

            const result = await request.query(`
                UPDATE dbo.ouderschapsplan_info
                SET ${updateFields.join(', ')}
                OUTPUT INSERTED.*
                WHERE id = @Id
            `);

            if (result.recordset.length === 0) {
                throw new Error('OuderschapsplanInfo not found');
            }

            return DbMappers.toOuderschapsplanInfo(result.recordset[0]);
        } catch (error) {
            console.error('Error updating ouderschapsplan info:', error);
            throw error;
        }
    }

    async deleteOuderschapsplanInfo(id: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const request = pool.request();

            request.input('Id', sql.Int, id);

            const result = await request.query(`
                DELETE FROM dbo.ouderschapsplan_info 
                WHERE id = @Id
            `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting ouderschapsplan info:', error);
            throw error;
        }
    }

    async getAllOuderschapsplanInfo(limit: number = 100, offset: number = 0): Promise<{ data: OuderschapsplanInfo[], total: number }> {
        try {
            const pool = await this.getPool();
            
            // Get total count
            const countRequest = pool.request();
            const countResult = await countRequest.query(`
                SELECT COUNT(*) as total FROM dbo.ouderschapsplan_info
            `);
            const total = countResult.recordset[0].total;

            // Get paginated data
            const request = pool.request();
            request.input('Limit', sql.Int, limit);
            request.input('Offset', sql.Int, offset);

            const result = await request.query(`
                SELECT * FROM dbo.ouderschapsplan_info
                ORDER BY updated_at DESC
                OFFSET @Offset ROWS
                FETCH NEXT @Limit ROWS ONLY
            `);

            return {
                data: result.recordset.map(DbMappers.toOuderschapsplanInfo),
                total
            };
        } catch (error) {
            console.error('Error getting all ouderschapsplan info:', error);
            throw error;
        }
    }
}
