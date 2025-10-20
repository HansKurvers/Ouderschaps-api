import sql from 'mssql';
import { getPool } from '../../config/database';

/**
 * Base Repository class providing common database operations
 * All domain-specific repositories should extend this class
 *
 * Benefits:
 * - Centralized connection pool management
 * - Type-safe query execution
 * - Consistent error handling
 * - Reusable transaction support
 */
export abstract class BaseRepository {
    /**
     * Gets the shared connection pool
     * Automatically initializes if not connected
     */
    protected async getPool(): Promise<sql.ConnectionPool> {
        return await getPool();
    }

    /**
     * Executes a parameterized query with automatic input binding
     *
     * @param query - SQL query string with @paramName placeholders
     * @param params - Object mapping parameter names to values or type configs
     * @returns Query result
     *
     * @example
     * ```typescript
     * const result = await this.executeQuery(
     *   'SELECT * FROM users WHERE id = @id',
     *   { id: 123 }
     * );
     * ```
     *
     * @example
     * ```typescript
     * const result = await this.executeQuery(
     *   'INSERT INTO users (name, email) VALUES (@name, @email)',
     *   {
     *     name: { value: 'John', type: sql.NVarChar(100) },
     *     email: 'john@example.com'
     *   }
     * );
     * ```
     */
    protected async executeQuery<T = any>(
        query: string,
        params?: Record<string, any>
    ): Promise<sql.IResult<T>> {
        const pool = await this.getPool();
        const request = pool.request();

        if (params) {
            for (const [key, config] of Object.entries(params)) {
                if (config && typeof config === 'object' && 'value' in config && 'type' in config) {
                    // Explicit type configuration: { value: x, type: sql.Int }
                    request.input(key, config.type, config.value);
                } else {
                    // Auto-detect type from value
                    request.input(key, config);
                }
            }
        }

        return await request.query<T>(query);
    }

    /**
     * Executes a query and returns the first record or null
     *
     * @param query - SQL query string
     * @param params - Query parameters
     * @returns First record or null if not found
     */
    protected async querySingle<T = any>(
        query: string,
        params?: Record<string, any>
    ): Promise<T | null> {
        const result = await this.executeQuery<T>(query, params);
        return result.recordset[0] || null;
    }

    /**
     * Executes a query and returns all records
     *
     * @param query - SQL query string
     * @param params - Query parameters
     * @returns Array of records
     */
    protected async queryMany<T = any>(
        query: string,
        params?: Record<string, any>
    ): Promise<T[]> {
        const result = await this.executeQuery<T>(query, params);
        return result.recordset;
    }

    /**
     * Checks if a record exists
     *
     * @param query - SQL query that should return COUNT(*) as count
     * @param params - Query parameters
     * @returns True if count > 0
     */
    protected async exists(
        query: string,
        params?: Record<string, any>
    ): Promise<boolean> {
        const result = await this.querySingle<{ count: number }>(query, params);
        return result ? result.count > 0 : false;
    }

    /**
     * Begins a transaction
     *
     * @returns Transaction object
     *
     * @example
     * ```typescript
     * const transaction = await this.beginTransaction();
     * try {
     *   await this.executeInTransaction(transaction, 'INSERT ...', params);
     *   await transaction.commit();
     * } catch (error) {
     *   await transaction.rollback();
     *   throw error;
     * }
     * ```
     */
    protected async beginTransaction(): Promise<sql.Transaction> {
        const pool = await this.getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        return transaction;
    }

    /**
     * Executes a query within a transaction
     *
     * @param transaction - Active transaction
     * @param query - SQL query string
     * @param params - Query parameters
     * @returns Query result
     */
    protected async executeInTransaction<T = any>(
        transaction: sql.Transaction,
        query: string,
        params?: Record<string, any>
    ): Promise<sql.IResult<T>> {
        const request = new sql.Request(transaction);

        if (params) {
            for (const [key, config] of Object.entries(params)) {
                if (config && typeof config === 'object' && 'value' in config && 'type' in config) {
                    request.input(key, config.type, config.value);
                } else {
                    request.input(key, config);
                }
            }
        }

        return await request.query<T>(query);
    }
}
