import sql from 'mssql';
import { initializeDatabase, closeDatabase } from '../config/database';
import { IDossier, IPerson, IChild, IOuderschapsplanGegevens, ICompleteDossierData } from '../models/Dossier';

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

    async getAllDossiers(userID: number): Promise<IDossier[]> {
        try {
            const pool = this.getPool();
            const request = pool.request();
            
            request.input('UserID', sql.Int, userID);
            
            const result = await request.query(`
                SELECT 
                    DossierID,
                    DossierNummer,
                    GebruikerID,
                    Status,
                    LaatsteWijziging
                FROM Dossiers 
                WHERE GebruikerID = @UserID
                ORDER BY LaatsteWijziging DESC
            `);
            
            return result.recordset;
        } catch (error) {
            console.error('Error getting all dossiers:', error);
            throw error;
        }
    }

    async getDossierById(dossierID: number): Promise<IDossier | null> {
        try {
            const pool = this.getPool();
            const request = pool.request();
            
            request.input('DossierID', sql.Int, dossierID);
            
            const result = await request.query(`
                SELECT 
                    DossierID,
                    DossierNummer,
                    GebruikerID,
                    Status,
                    LaatsteWijziging
                FROM Dossiers 
                WHERE DossierID = @DossierID
            `);
            
            return result.recordset[0] || null;
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
                FROM Dossiers 
                WHERE DossierID = @DossierID AND GebruikerID = @UserID
            `);
            
            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking dossier access:', error);
            throw error;
        }
    }

    async createDossier(userID: number): Promise<IDossier> {
        try {
            const pool = this.getPool();
            const dossierNumber = await this.generateNextDossierNumber();
            
            const request = pool.request();
            request.input('DossierNummer', sql.NVarChar, dossierNumber);
            request.input('GebruikerID', sql.Int, userID);
            request.input('Status', sql.NVarChar, 'Nieuw');
            request.input('LaatsteWijziging', sql.DateTime, new Date());
            
            const result = await request.query(`
                INSERT INTO Dossiers (DossierNummer, GebruikerID, Status, LaatsteWijziging)
                OUTPUT INSERTED.*
                VALUES (@DossierNummer, @GebruikerID, @Status, @LaatsteWijziging)
            `);
            
            return result.recordset[0];
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
            await transaction.request()
                .input('DossierID', sql.Int, dossierID)
                .query('DELETE FROM OuderschapsplanGegevens WHERE DossierID = @DossierID');
            
            await transaction.request()
                .input('DossierID', sql.Int, dossierID)
                .query('DELETE FROM Kinderen WHERE DossierID = @DossierID');
            
            await transaction.request()
                .input('DossierID', sql.Int, dossierID)
                .query('DELETE FROM Personen WHERE DossierID = @DossierID');
            
            const result = await transaction.request()
                .input('DossierID', sql.Int, dossierID)
                .query('DELETE FROM Dossiers WHERE DossierID = @DossierID');
            
            await transaction.commit();
            return result.rowsAffected[0] > 0;
        } catch (error) {
            await transaction.rollback();
            console.error('Error deleting dossier:', error);
            throw error;
        }
    }

    async generateNextDossierNumber(): Promise<string> {
        try {
            const pool = this.getPool();
            const request = pool.request();
            
            const result = await request.query(`
                SELECT MAX(CAST(DossierNummer AS INT)) as maxNumber
                FROM Dossiers
                WHERE ISNUMERIC(DossierNummer) = 1
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

    async getPersons(dossierID: number): Promise<IPerson[]> {
        try {
            const pool = this.getPool();
            const request = pool.request();
            
            request.input('DossierID', sql.Int, dossierID);
            
            const result = await request.query(`
                SELECT * FROM Personen 
                WHERE DossierID = @DossierID
                ORDER BY PersoonType
            `);
            
            return result.recordset;
        } catch (error) {
            console.error('Error getting persons:', error);
            throw error;
        }
    }

    async getChildren(dossierID: number): Promise<IChild[]> {
        try {
            const pool = this.getPool();
            const request = pool.request();
            
            request.input('DossierID', sql.Int, dossierID);
            
            const result = await request.query(`
                SELECT * FROM Kinderen 
                WHERE DossierID = @DossierID
                ORDER BY Volgorde
            `);
            
            return result.recordset;
        } catch (error) {
            console.error('Error getting children:', error);
            throw error;
        }
    }

    async getOuderschapsplanGegevens(dossierID: number): Promise<IOuderschapsplanGegevens[]> {
        try {
            const pool = this.getPool();
            const request = pool.request();
            
            request.input('DossierID', sql.Int, dossierID);
            
            const result = await request.query(`
                SELECT * FROM OuderschapsplanGegevens 
                WHERE DossierID = @DossierID
                ORDER BY VeldCode
            `);
            
            return result.recordset;
        } catch (error) {
            console.error('Error getting ouderschapsplan gegevens:', error);
            throw error;
        }
    }

    async getCompleteDossierData(dossierID: number): Promise<ICompleteDossierData | null> {
        try {
            const dossier = await this.getDossierById(dossierID);
            if (!dossier) {
                return null;
            }
            
            const [persons, children, ouderschapsplanGegevens] = await Promise.all([
                this.getPersons(dossierID),
                this.getChildren(dossierID),
                this.getOuderschapsplanGegevens(dossierID)
            ]);
            
            return {
                dossier,
                persons,
                children,
                ouderschapsplanGegevens
            };
        } catch (error) {
            console.error('Error getting complete dossier data:', error);
            throw error;
        }
    }

    async savePerson(dossierID: number, personData: Partial<IPerson>): Promise<IPerson> {
        try {
            const pool = this.getPool();
            const request = pool.request();
            
            // Check if person exists
            const existingPerson = await request
                .input('DossierID', sql.Int, dossierID)
                .input('PersoonType', sql.NVarChar, personData.PersoonType)
                .query(`
                    SELECT PersoonID FROM Personen 
                    WHERE DossierID = @DossierID AND PersoonType = @PersoonType
                `);
            
            if (existingPerson.recordset.length > 0) {
                // Update existing person
                const updateRequest = pool.request();
                updateRequest.input('PersoonID', sql.Int, existingPerson.recordset[0].PersoonID);
                updateRequest.input('Voornaam', sql.NVarChar, personData.Voornaam);
                updateRequest.input('Tussenvoegsel', sql.NVarChar, personData.Tussenvoegsel);
                updateRequest.input('Achternaam', sql.NVarChar, personData.Achternaam);
                updateRequest.input('Geboortedatum', sql.Date, personData.Geboortedatum);
                updateRequest.input('Adres', sql.NVarChar, personData.Adres);
                updateRequest.input('Postcode', sql.NVarChar, personData.Postcode);
                updateRequest.input('Woonplaats', sql.NVarChar, personData.Woonplaats);
                updateRequest.input('Telefoonnummer', sql.NVarChar, personData.Telefoonnummer);
                updateRequest.input('Email', sql.NVarChar, personData.Email);
                updateRequest.input('BSN', sql.NVarChar, personData.BSN);
                
                const result = await updateRequest.query(`
                    UPDATE Personen SET
                        Voornaam = @Voornaam,
                        Tussenvoegsel = @Tussenvoegsel,
                        Achternaam = @Achternaam,
                        Geboortedatum = @Geboortedatum,
                        Adres = @Adres,
                        Postcode = @Postcode,
                        Woonplaats = @Woonplaats,
                        Telefoonnummer = @Telefoonnummer,
                        Email = @Email,
                        BSN = @BSN
                    OUTPUT INSERTED.*
                    WHERE PersoonID = @PersoonID
                `);
                
                return result.recordset[0];
            } else {
                // Insert new person
                const insertRequest = pool.request();
                insertRequest.input('DossierID', sql.Int, dossierID);
                insertRequest.input('PersoonType', sql.NVarChar, personData.PersoonType);
                insertRequest.input('Voornaam', sql.NVarChar, personData.Voornaam);
                insertRequest.input('Tussenvoegsel', sql.NVarChar, personData.Tussenvoegsel);
                insertRequest.input('Achternaam', sql.NVarChar, personData.Achternaam);
                insertRequest.input('Geboortedatum', sql.Date, personData.Geboortedatum);
                insertRequest.input('Adres', sql.NVarChar, personData.Adres);
                insertRequest.input('Postcode', sql.NVarChar, personData.Postcode);
                insertRequest.input('Woonplaats', sql.NVarChar, personData.Woonplaats);
                insertRequest.input('Telefoonnummer', sql.NVarChar, personData.Telefoonnummer);
                insertRequest.input('Email', sql.NVarChar, personData.Email);
                insertRequest.input('BSN', sql.NVarChar, personData.BSN);
                
                const result = await insertRequest.query(`
                    INSERT INTO Personen (
                        DossierID, PersoonType, Voornaam, Tussenvoegsel, Achternaam,
                        Geboortedatum, Adres, Postcode, Woonplaats, Telefoonnummer, Email, BSN
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @DossierID, @PersoonType, @Voornaam, @Tussenvoegsel, @Achternaam,
                        @Geboortedatum, @Adres, @Postcode, @Woonplaats, @Telefoonnummer, @Email, @BSN
                    )
                `);
                
                return result.recordset[0];
            }
        } catch (error) {
            console.error('Error saving person:', error);
            throw error;
        }
    }

    async saveOuderschapsplanGegevens(dossierID: number, formData: Record<string, any>): Promise<void> {
        try {
            const pool = this.getPool();
            
            for (const [fieldCode, fieldValue] of Object.entries(formData)) {
                const request = pool.request();
                
                // Check if field exists
                const existingField = await request
                    .input('DossierID', sql.Int, dossierID)
                    .input('VeldCode', sql.NVarChar, fieldCode)
                    .query(`
                        SELECT GegevenID FROM OuderschapsplanGegevens 
                        WHERE DossierID = @DossierID AND VeldCode = @VeldCode
                    `);
                
                if (existingField.recordset.length > 0) {
                    // Update existing field
                    const updateRequest = pool.request();
                    updateRequest.input('GegevenID', sql.Int, existingField.recordset[0].GegevenID);
                    updateRequest.input('VeldWaarde', sql.NVarChar, String(fieldValue));
                    
                    await updateRequest.query(`
                        UPDATE OuderschapsplanGegevens 
                        SET VeldWaarde = @VeldWaarde
                        WHERE GegevenID = @GegevenID
                    `);
                } else {
                    // Insert new field
                    const insertRequest = pool.request();
                    insertRequest.input('DossierID', sql.Int, dossierID);
                    insertRequest.input('VeldCode', sql.NVarChar, fieldCode);
                    insertRequest.input('VeldNaam', sql.NVarChar, fieldCode); // Use fieldCode as name for now
                    insertRequest.input('VeldWaarde', sql.NVarChar, String(fieldValue));
                    
                    await insertRequest.query(`
                        INSERT INTO OuderschapsplanGegevens (DossierID, VeldCode, VeldNaam, VeldWaarde)
                        VALUES (@DossierID, @VeldCode, @VeldNaam, @VeldWaarde)
                    `);
                }
            }
        } catch (error) {
            console.error('Error saving ouderschapsplan gegevens:', error);
            throw error;
        }
    }
}