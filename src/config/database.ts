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
        connectTimeout: 60000,
        requestTimeout: 60000,
    },
    connectionTimeout: 60000,
    requestTimeout: 60000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 180000, // 3 minutes - optimized for Serverless auto-pause
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 60000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
    },
};

let connectionPool: sql.ConnectionPool | null = null;
let isConnecting = false;

export const initializeDatabase = async (): Promise<sql.ConnectionPool> => {
    try {
        // If already connected, return existing pool
        if (connectionPool && connectionPool.connected) {
            return connectionPool;
        }

        // If already connecting, wait for connection
        if (isConnecting) {
            while (isConnecting) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (connectionPool && connectionPool.connected) {
                return connectionPool;
            }
        }

        isConnecting = true;

        // Close existing pool if it exists but is not connected
        if (connectionPool) {
            try {
                await connectionPool.close();
            } catch (error) {
                console.warn('Error closing existing pool:', error);
            }
            connectionPool = null;
        }

        // Create new connection pool
        connectionPool = new sql.ConnectionPool(dbConfig);

        // Add connection event listeners
        connectionPool.on('connect', () => {
            console.log('SQL Server connected successfully');
            isConnecting = false;
        });

        connectionPool.on('error', err => {
            console.error('SQL Server connection error:', err);
            console.error('Error details:', {
                message: err.message,
                code: (err as any).code,
                state: (err as any).state,
                severity: (err as any).severity,
                serverName: (err as any).serverName,
                procName: (err as any).procName
            });
            isConnecting = false;
            connectionPool = null;
        });

        connectionPool.on('close', () => {
            console.log('SQL Server connection closed');
            isConnecting = false;
            connectionPool = null;
        });

        await connectionPool.connect();
        isConnecting = false;

        return connectionPool;
    } catch (error) {
        console.error('Database connection failed:', error);
        isConnecting = false;
        connectionPool = null;
        throw error;
    }
};

export const getPool = async (): Promise<sql.ConnectionPool> => {
    if (!connectionPool || !connectionPool.connected) {
        return await initializeDatabase();
    }
    return connectionPool;
};

export const closeDatabase = async (): Promise<void> => {
    if (connectionPool) {
        try {
            await connectionPool.close();
        } catch (error) {
            console.warn('Error closing database connection:', error);
        } finally {
            connectionPool = null;
            isConnecting = false;
            console.log('Database connection closed');
        }
    }
};

export default initializeDatabase;
