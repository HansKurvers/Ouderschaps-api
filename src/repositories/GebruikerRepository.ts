import { BaseRepository } from './base/BaseRepository';

/**
 * GebruikerRepository
 * Manages users in dbo.gebruikers table
 */

export interface Gebruiker {
    id: number;
    auth0_id: string | null;
    email: string | null;
    naam: string | null;
}

export class GebruikerRepository extends BaseRepository {

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<Gebruiker | null> {
        const query = `
            SELECT id, auth0_id, email, naam
            FROM dbo.gebruikers
            WHERE email = @email
        `;

        return await this.querySingle<Gebruiker>(query, { email });
    }

    /**
     * Find user by Auth0 ID
     */
    async findByAuth0Id(auth0Id: string): Promise<Gebruiker | null> {
        const query = `
            SELECT id, auth0_id, email, naam
            FROM dbo.gebruikers
            WHERE auth0_id = @auth0Id
        `;

        return await this.querySingle<Gebruiker>(query, { auth0Id });
    }

    /**
     * Create a new user (with or without auth0_id)
     */
    async create(email: string, auth0Id: string | null = null, naam: string | null = null): Promise<Gebruiker> {
        const query = `
            INSERT INTO dbo.gebruikers (auth0_id, email, naam, aangemaakt_op, gewijzigd_op, laatste_login)
            OUTPUT INSERTED.*
            VALUES (@auth0Id, @email, @naam, GETDATE(), GETDATE(), GETDATE())
        `;

        const result = await this.executeQuery<Gebruiker>(query, {
            auth0Id,
            email,
            naam
        });

        const user = result.recordset[0];
        if (!user) throw new Error('Failed to create user');

        return user;
    }

    /**
     * Update user's auth0_id (when they first login after invitation)
     */
    async updateAuth0Id(email: string, auth0Id: string): Promise<boolean> {
        const query = `
            UPDATE dbo.gebruikers
            SET auth0_id = @auth0Id, laatste_login = GETDATE()
            WHERE email = @email AND auth0_id IS NULL
        `;

        const result = await this.executeQuery(query, { email, auth0Id });
        return (result.rowsAffected[0] || 0) > 0;
    }

    /**
     * Find or create user - handles the case where user exists by auth0_id but not by email
     * This prevents duplicate key errors when sharing dossiers
     */
    async findOrCreate(email: string, auth0Id: string | null = null): Promise<{ gebruiker: Gebruiker; isNew: boolean }> {
        // First try to find by email
        let gebruiker = await this.findByEmail(email);
        if (gebruiker) {
            // If found by email but auth0_id is different/new, update it
            if (auth0Id && !gebruiker.auth0_id) {
                await this.updateAuth0Id(email, auth0Id);
                gebruiker.auth0_id = auth0Id;
            }
            return { gebruiker, isNew: false };
        }

        // If auth0_id provided, try to find by auth0_id
        if (auth0Id) {
            gebruiker = await this.findByAuth0Id(auth0Id);
            if (gebruiker) {
                // User exists with this auth0_id but different/no email - update email
                const updateQuery = `
                    UPDATE dbo.gebruikers
                    SET email = @email, gewijzigd_op = GETDATE()
                    WHERE auth0_id = @auth0Id
                `;
                await this.executeQuery(updateQuery, { email, auth0Id });
                gebruiker.email = email;
                return { gebruiker, isNew: false };
            }
        }

        // User doesn't exist - create new
        gebruiker = await this.create(email, auth0Id);
        return { gebruiker, isNew: true };
    }
}
