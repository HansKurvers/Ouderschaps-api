import sql from 'mssql';
import { closeDatabase, initializeDatabase } from '../config/database';
import {
    CompleteDossierData,
    CreateOmgangDto,
    CreateZorgDto,
    Dag,
    Dagdeel,
    Dossier,
    Omgang,
    Persoon,
    RelatieType,
    Rol,
    UpdateOmgangDto,
    UpdateZorgDto,
    WeekRegeling,
    Zorg,
    ZorgCategorie,
    ZorgSituatie,
} from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

export class DossierDatabaseService {
    private pool: sql.ConnectionPool | null = null;

    async initialize(): Promise<void> {
        try {
            this.pool = await initializeDatabase();
        } catch (error) {
            console.error('Failed to initialize database service:', error);
            throw error;
        }
    }

    async close(): Promise<void> {
        await closeDatabase();
        this.pool = null;
    }

    private getPool(): sql.ConnectionPool {
        if (!this.pool) {
            throw new Error('Database service not initialized. Call initialize() first.');
        }
        return this.pool;
    }

    async getAllDossiers(userID: number): Promise<Dossier[]> {
        try {
            const pool = this.getPool();
            const request = pool.request();

            request.input('UserID', sql.Int, userID);

            const result = await request.query(`
                SELECT 
                    id,
                    dossier_nummer,
                    gebruiker_id,
                    status,
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
            const pool = this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);

            const result = await request.query(`
                SELECT 
                    id,
                    dossier_nummer,
                    gebruiker_id,
                    status,
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
            const pool = this.getPool();
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
            const pool = this.getPool();
            const dossierNumber = await this.generateNextDossierNumber();

            const request = pool.request();
            request.input('DossierNummer', sql.NVarChar, dossierNumber);
            request.input('GebruikerID', sql.Int, userID);
            request.input('Status', sql.NVarChar, 'Nieuw');

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

    async deleteDossier(dossierID: number): Promise<boolean> {
        const transaction = new sql.Transaction(this.getPool());

        try {
            await transaction.begin();

            // Delete related data in correct order
            // First delete ouderschapsplan gegevens
            await transaction
                .request()
                .input('DossierID', sql.Int, dossierID)
                .query('DELETE FROM dbo.dossiers WHERE id = @DossierID');

            // Delete dossier-child relationships
            await transaction
                .request()
                .input('DossierID', sql.Int, dossierID)
                .query('DELETE FROM dbo.dossiers_kinderen WHERE dossier_id = @DossierID');

            // Delete dossier-party relationships
            await transaction
                .request()
                .input('DossierID', sql.Int, dossierID)
                .query('DELETE FROM dbo.dossiers_partijen WHERE dossier_id = @DossierID');

            // Finally delete the dossier itself
            const result = await transaction
                .request()
                .input('DossierID', sql.Int, dossierID)
                .query('DELETE FROM dbo.dossiers WHERE id = @DossierID');

            await transaction.commit();
            return result.rowsAffected[0] > 0;
        } catch (error) {
            await transaction.rollback();
            console.error('Error deleting dossier:', error);
            throw error;
        }
    }

    async updateDossierStatus(dossierID: number, status: string): Promise<Dossier> {
        try {
            const pool = this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);
            request.input('Status', sql.NVarChar(50), status);

            const result = await request.query(`
                UPDATE dbo.dossiers 
                SET status = @Status, gewijzigd_op = GETDATE()
                WHERE id = @DossierID;
                
                SELECT 
                    id,
                    dossier_nummer,
                    gebruiker_id,
                    status,
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

    async generateNextDossierNumber(): Promise<string> {
        try {
            const pool = this.getPool();
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
            const pool = this.getPool();
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
        Array<{ kind: Persoon; ouders: Array<{ ouder: Persoon; relatieType: RelatieType }> }>
    > {
        try {
            const pool = this.getPool();
            const request = pool.request();

            request.input('DossierID', sql.Int, dossierID);

            // Get children associated with this dossier
            const kinderenResult = await request.query(`
                SELECT DISTINCT p.*
                FROM dbo.dossiers_kinderen dk
                JOIN dbo.personen p ON dk.kind_id = p.id
                WHERE dk.dossier_id = @DossierID
            `);

            const kinderen = [];

            // For each child, get their parents
            for (const kindRow of kinderenResult.recordset) {
                const kind = DbMappers.toPersoon(kindRow);

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

                kinderen.push({ kind, ouders });
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
            const pool = this.getPool();
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
                request.input('GeboortePlaats', sql.NVarChar, dto.geboorte_plaats);
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
                        geboorte_plaats = @GeboortePlaats,
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
                request.input('GeboortePlaats', sql.NVarChar, dto.geboorte_plaats);
                request.input('GeboorteDatum', sql.Date, dto.geboorte_datum);
                request.input('Nationaliteit1', sql.NVarChar, dto.nationaliteit_1);
                request.input('Nationaliteit2', sql.NVarChar, dto.nationaliteit_2);
                request.input('Telefoon', sql.NVarChar, dto.telefoon);
                request.input('Email', sql.NVarChar, dto.email);
                request.input('Beroep', sql.NVarChar, dto.beroep);

                const result = await request.query(`
                    INSERT INTO dbo.personen (
                        voorletters, voornamen, roepnaam, geslacht, tussenvoegsel, achternaam,
                        adres, postcode, plaats, geboorte_plaats, geboorte_datum,
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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

    async getZorgSituaties(categorieId?: number): Promise<ZorgSituatie[]> {
        try {
            const pool = this.getPool();
            const request = pool.request();

            let query = `
                SELECT id, naam, zorg_categorie_id 
                FROM dbo.zorg_situaties 
            `;

            if (categorieId) {
                query += ' WHERE zorg_categorie_id = @CategorieId ';
                request.input('CategorieId', sql.Int, categorieId);
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

    // Omgang CRUD methods
    async getOmgangByDossier(dossierId: number): Promise<Omgang[]> {
        try {
            const pool = this.getPool();
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
                    p.geboorte_plaats,
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
                    geboorte_plaats: row.geboorte_plaats,
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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

    // Zorg CRUD methods
    async getZorgByDossier(dossierId: number): Promise<Zorg[]> {
        try {
            const pool = this.getPool();
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

    async createZorg(data: CreateZorgDto & {aangemaaktDoor: number}): Promise<Zorg> {
        try {
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
            const pool = this.getPool();
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
}
