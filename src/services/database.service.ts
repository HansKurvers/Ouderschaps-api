import sql from 'mssql';
import { initializeDatabase, getPool } from '../config/database';

export class DatabaseService {
    async initialize(): Promise<void> {
        await initializeDatabase();
    }

    async close(): Promise<void> {
        // Don't close the shared pool in Azure Functions
        // The pool will be reused across function invocations
    }

    protected async getPool(): Promise<sql.ConnectionPool> {
        return await getPool();
    }

    async executeQuery(query: string, inputs?: Record<string, any>): Promise<sql.IResult<any>> {
        const pool = await this.getPool();
        const request = pool.request();

        if (inputs) {
            for (const [key, config] of Object.entries(inputs)) {
                if (config && typeof config === 'object' && 'value' in config && 'type' in config) {
                    request.input(key, config.type, config.value);
                } else {
                    request.input(key, config);
                }
            }
        }

        return await request.query(query);
    }
}