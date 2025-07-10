import sql from 'mssql';
import { closeDatabase, initializeDatabase } from '../config/database';
import {
    CompleteDossierData,
    Dossier,
    Persoon,
    RelatieType,
    Rol,
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
}
