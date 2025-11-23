import sql from 'mssql';
import { getPool } from '../config/database';
import {
    Omgangsregeling,
    CreateOmgangsregelingDto,
    UpdateOmgangsregelingDto
} from '../models/Omgangsregeling';

export class OmgangsregelingService {
    private async getPool(): Promise<sql.ConnectionPool> {
        return await getPool();
    }

    /**
     * Get omgangsregeling by dossier ID
     */
    async getByDossierId(dossierId: number): Promise<Omgangsregeling | null> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('DossierId', sql.Int, dossierId)
                .query(`
                    SELECT
                        id,
                        dossier_id as dossierId,
                        omgang_tekst_of_schema as omgangTekstOfSchema,
                        omgang_beschrijving as omgangBeschrijving,
                        created_at as createdAt,
                        updated_at as updatedAt
                    FROM dbo.omgangsregeling
                    WHERE dossier_id = @DossierId
                `);

            if (!result.recordset[0]) {
                return null;
            }

            return result.recordset[0] as Omgangsregeling;
        } catch (error) {
            console.error('Error getting omgangsregeling by dossier ID:', error);
            throw error;
        }
    }

    /**
     * Get omgangsregeling by ID
     */
    async getById(id: number): Promise<Omgangsregeling | null> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .query(`
                    SELECT
                        id,
                        dossier_id as dossierId,
                        omgang_tekst_of_schema as omgangTekstOfSchema,
                        omgang_beschrijving as omgangBeschrijving,
                        created_at as createdAt,
                        updated_at as updatedAt
                    FROM dbo.omgangsregeling
                    WHERE id = @Id
                `);

            if (!result.recordset[0]) {
                return null;
            }

            return result.recordset[0] as Omgangsregeling;
        } catch (error) {
            console.error('Error getting omgangsregeling by ID:', error);
            throw error;
        }
    }

    /**
     * Create new omgangsregeling
     */
    async create(data: CreateOmgangsregelingDto): Promise<Omgangsregeling> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('DossierId', sql.Int, data.dossierId)
                .input('OmgangTekstOfSchema', sql.NVarChar(50), data.omgangTekstOfSchema || null)
                .input('OmgangBeschrijving', sql.NVarChar(sql.MAX), data.omgangBeschrijving || null)
                .query(`
                    INSERT INTO dbo.omgangsregeling
                    (dossier_id, omgang_tekst_of_schema, omgang_beschrijving)
                    OUTPUT
                        inserted.id,
                        inserted.dossier_id as dossierId,
                        inserted.omgang_tekst_of_schema as omgangTekstOfSchema,
                        inserted.omgang_beschrijving as omgangBeschrijving,
                        inserted.created_at as createdAt,
                        inserted.updated_at as updatedAt
                    VALUES (@DossierId, @OmgangTekstOfSchema, @OmgangBeschrijving)
                `);

            return result.recordset[0] as Omgangsregeling;
        } catch (error) {
            console.error('Error creating omgangsregeling:', error);
            throw error;
        }
    }

    /**
     * Update existing omgangsregeling
     */
    async update(id: number, data: UpdateOmgangsregelingDto): Promise<Omgangsregeling | null> {
        try {
            const pool = await this.getPool();

            // Build update query dynamically based on provided fields
            const updateFields = [];
            const request = pool.request();
            request.input('Id', sql.Int, id);

            if (data.omgangTekstOfSchema !== undefined) {
                updateFields.push('omgang_tekst_of_schema = @OmgangTekstOfSchema');
                request.input('OmgangTekstOfSchema', sql.NVarChar(50), data.omgangTekstOfSchema);
            }
            if (data.omgangBeschrijving !== undefined) {
                updateFields.push('omgang_beschrijving = @OmgangBeschrijving');
                request.input('OmgangBeschrijving', sql.NVarChar(sql.MAX), data.omgangBeschrijving);
            }

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            // Always update the updated_at timestamp
            updateFields.push('updated_at = GETDATE()');

            const result = await request.query(`
                UPDATE dbo.omgangsregeling
                SET ${updateFields.join(', ')}
                OUTPUT
                    inserted.id,
                    inserted.dossier_id as dossierId,
                    inserted.omgang_tekst_of_schema as omgangTekstOfSchema,
                    inserted.omgang_beschrijving as omgangBeschrijving,
                    inserted.created_at as createdAt,
                    inserted.updated_at as updatedAt
                WHERE id = @Id
            `);

            if (!result.recordset[0]) {
                return null;
            }

            return result.recordset[0] as Omgangsregeling;
        } catch (error) {
            console.error('Error updating omgangsregeling:', error);
            throw error;
        }
    }

    /**
     * Update by dossier ID (creates if doesn't exist)
     */
    async upsertByDossierId(dossierId: number, data: UpdateOmgangsregelingDto): Promise<Omgangsregeling> {
        try {
            // Try to get existing record
            const existing = await this.getByDossierId(dossierId);

            if (existing) {
                // Update existing
                const updated = await this.update(existing.id, data);
                if (!updated) {
                    throw new Error('Failed to update omgangsregeling');
                }
                return updated;
            } else {
                // Create new
                return await this.create({
                    dossierId,
                    ...data
                });
            }
        } catch (error) {
            console.error('Error upserting omgangsregeling:', error);
            throw error;
        }
    }

    /**
     * Delete omgangsregeling
     */
    async delete(id: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .query(`
                    DELETE FROM dbo.omgangsregeling
                    WHERE id = @Id
                `);

            return result.rowsAffected[0] > 0;
        } catch (error) {
            console.error('Error deleting omgangsregeling:', error);
            throw error;
        }
    }

    /**
     * Check if user has access to omgangsregeling (via dossier ownership)
     */
    async checkAccess(id: number, userId: number): Promise<boolean> {
        try {
            const pool = await this.getPool();
            const result = await pool.request()
                .input('Id', sql.Int, id)
                .input('UserId', sql.Int, userId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM dbo.omgangsregeling o
                    INNER JOIN dbo.dossiers d ON o.dossier_id = d.id
                    WHERE o.id = @Id AND d.gebruiker_id = @UserId
                `);

            return result.recordset[0].count > 0;
        } catch (error) {
            console.error('Error checking omgangsregeling access:', error);
            throw error;
        }
    }
}
