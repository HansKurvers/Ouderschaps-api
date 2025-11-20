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
}
