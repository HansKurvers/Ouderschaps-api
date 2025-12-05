import sql from 'mssql';
import { DatabaseService } from '../database.service';
import { GebruikerRepository } from '../../repositories/GebruikerRepository';

export interface User {
    id: number;
    auth0Id: string;
    email: string | null;
    naam: string | null;
}

export interface Auth0User {
    sub: string;
    email?: string;
    name?: string;
}

export class UserService {
    constructor(private db: DatabaseService) {}

    async findOrCreateUser(auth0User: Auth0User): Promise<User> {
        // Try to find by auth0_id first
        const existingUser = await this.getUserByAuth0Id(auth0User.sub);

        if (existingUser) {
            return existingUser;
        }

        // Check if user exists without auth0_id (invited but not logged in yet)
        if (auth0User.email) {
            const updated = await this.linkAuth0ToExistingUser(auth0User.sub, auth0User.email);
            if (updated) {
                return updated;
            }
        }

        // Create new user
        return await this.createUser(auth0User);
    }

    /**
     * Link auth0_id to existing user (for invited users logging in for first time)
     */
    private async linkAuth0ToExistingUser(auth0Id: string, email: string): Promise<User | null> {
        try {
            const repo = new GebruikerRepository();
            const updated = await repo.updateAuth0Id(email, auth0Id);

            if (updated) {
                // Fetch the updated user
                return await this.getUserByAuth0Id(auth0Id);
            }

            return null;
        } catch (error) {
            console.error('Failed to link auth0_id to existing user:', error);
            return null;
        }
    }

    async getUserByAuth0Id(auth0Id: string): Promise<User | null> {
        await this.db.initialize();
        const result = await this.db.executeQuery(
            `SELECT id, auth0_id, email, naam 
             FROM dbo.gebruikers 
             WHERE auth0_id = @auth0Id`,
            {
                auth0Id: { value: auth0Id, type: sql.NVarChar }
            }
        );

        if (result.recordset.length === 0) {
            return null;
        }

        return this.mapToUser(result.recordset[0]);
    }

    async getUserById(id: number): Promise<User | null> {
        await this.db.initialize();
        const result = await this.db.executeQuery(
            `SELECT id, auth0_id, email, naam 
             FROM dbo.gebruikers 
             WHERE id = @id`,
            {
                id: { value: id, type: sql.Int }
            }
        );

        if (result.recordset.length === 0) {
            return null;
        }

        return this.mapToUser(result.recordset[0]);
    }

    private async createUser(auth0User: Auth0User): Promise<User> {
        await this.db.initialize();

        // Determine correct email and name values
        // Auth0 sometimes puts email in the name field for email/password accounts
        let email = auth0User.email || null;
        let name = auth0User.name || null;

        // If name looks like an email address and we don't have an email, use name as email
        if (name && name.includes('@') && !email) {
            email = name;
            name = null;
        }
        // If name looks like an email address and we already have an email, clear the name
        else if (name && name.includes('@') && email) {
            name = null;
        }

        const result = await this.db.executeQuery(
            `INSERT INTO dbo.gebruikers (auth0_id, email, naam, aangemaakt_op, gewijzigd_op, laatste_login)
             OUTPUT INSERTED.*
             VALUES (@auth0Id, @email, @naam, GETDATE(), GETDATE(), GETDATE())`,
            {
                auth0Id: { value: auth0User.sub, type: sql.NVarChar },
                email: { value: email, type: sql.NVarChar },
                naam: { value: name, type: sql.NVarChar }
            }
        );

        return this.mapToUser(result.recordset[0]);
    }

    private mapToUser(record: any): User {
        return {
            id: record.id,
            auth0Id: record.auth0_id,
            email: record.email,
            naam: record.naam
        };
    }
}