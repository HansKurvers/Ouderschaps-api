import sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const dbConfig: sql.config = {
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
    },
};

let connectionPool: sql.ConnectionPool | null = null;

export const initializeDatabase = async (): Promise<sql.ConnectionPool> => {
    try {
        if (!connectionPool) {
            connectionPool = new sql.ConnectionPool(dbConfig);
            
            // Add connection event listeners
            connectionPool.on('connect', () => {
                console.log('SQL Server connected successfully');
            });
            
            connectionPool.on('error', (err) => {
                console.error('SQL Server connection error:', err);
            });
            
            await connectionPool.connect();
        }
        
        return connectionPool;
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
};

export const getPool = (): sql.ConnectionPool => {
    if (!connectionPool) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return connectionPool;
};

export const closeDatabase = async (): Promise<void> => {
    if (connectionPool) {
        await connectionPool.close();
        connectionPool = null;
        console.log('Database connection closed');
    }
};

export default initializeDatabase;