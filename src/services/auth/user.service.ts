import sql from 'mssql';
import { DatabaseService } from '../database.service';

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
        const existingUser = await this.getUserByAuth0Id(auth0User.sub);
        
        if (existingUser) {
            return existingUser;
        }

        return await this.createUser(auth0User);
    }

    async getUserByAuth0Id(auth0Id: string): Promise<User | null> {
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
        const result = await this.db.executeQuery(
            `INSERT INTO dbo.gebruikers (auth0_id, email, naam, aangemaakt_op, gewijzigd_op, laatste_login)
             OUTPUT INSERTED.*
             VALUES (@auth0Id, @email, @naam, GETDATE(), GETDATE(), GETDATE())`,
            {
                auth0Id: { value: auth0User.sub, type: sql.NVarChar },
                email: { value: auth0User.email || null, type: sql.NVarChar },
                naam: { value: auth0User.name || null, type: sql.NVarChar }
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