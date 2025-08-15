import { UserService } from './user.service';
import { DatabaseService } from '../database.service';
import sql from 'mssql';

jest.mock('../database.service');

describe('UserService', () => {
    let userService: UserService;
    let mockDb: jest.Mocked<DatabaseService>;

    beforeEach(() => {
        mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
        userService = new UserService(mockDb);
    });

    describe('findOrCreateUser', () => {
        const auth0User = {
            sub: 'auth0|123456',
            email: 'test@example.com',
            name: 'Test User'
        };

        it('should return existing user if found', async () => {
            const existingUser = {
                id: 42,
                auth0_id: 'auth0|123456',
                email: 'test@example.com',
                naam: 'Test User'
            };

            mockDb.executeQuery = jest.fn().mockResolvedValue({
                recordset: [existingUser]
            });

            const result = await userService.findOrCreateUser(auth0User);

            expect(result).toEqual({
                id: 42,
                auth0Id: 'auth0|123456',
                email: 'test@example.com',
                naam: 'Test User'
            });
            expect(mockDb.executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.objectContaining({
                    auth0Id: { value: 'auth0|123456', type: sql.NVarChar }
                })
            );
        });

        it('should create new user if not found', async () => {
            mockDb.executeQuery = jest.fn()
                .mockResolvedValueOnce({ recordset: [] })
                .mockResolvedValueOnce({
                    recordset: [{
                        id: 43,
                        auth0_id: 'auth0|123456',
                        email: 'test@example.com',
                        naam: 'Test User'
                    }]
                });

            const result = await userService.findOrCreateUser(auth0User);

            expect(result).toEqual({
                id: 43,
                auth0Id: 'auth0|123456',
                email: 'test@example.com',
                naam: 'Test User'
            });
            expect(mockDb.executeQuery).toHaveBeenCalledTimes(2);
            expect(mockDb.executeQuery).toHaveBeenLastCalledWith(
                expect.stringContaining('INSERT'),
                expect.objectContaining({
                    auth0Id: { value: 'auth0|123456', type: sql.NVarChar },
                    email: { value: 'test@example.com', type: sql.NVarChar },
                    naam: { value: 'Test User', type: sql.NVarChar }
                })
            );
        });

        it('should handle user without email', async () => {
            const userWithoutEmail = {
                sub: 'auth0|789',
                name: 'No Email User'
            };

            mockDb.executeQuery = jest.fn()
                .mockResolvedValueOnce({ recordset: [] })
                .mockResolvedValueOnce({
                    recordset: [{
                        id: 44,
                        auth0_id: 'auth0|789',
                        email: null,
                        naam: 'No Email User'
                    }]
                });

            const result = await userService.findOrCreateUser(userWithoutEmail);

            expect(result).toEqual({
                id: 44,
                auth0Id: 'auth0|789',
                email: null,
                naam: 'No Email User'
            });
        });
    });

    describe('getUserByAuth0Id', () => {
        it('should return user if found', async () => {
            const user = {
                id: 42,
                auth0_id: 'auth0|123456',
                email: 'test@example.com',
                naam: 'Test User'
            };

            mockDb.executeQuery = jest.fn().mockResolvedValue({
                recordset: [user]
            });

            const result = await userService.getUserByAuth0Id('auth0|123456');

            expect(result).toEqual({
                id: 42,
                auth0Id: 'auth0|123456',
                email: 'test@example.com',
                naam: 'Test User'
            });
        });

        it('should return null if user not found', async () => {
            mockDb.executeQuery = jest.fn().mockResolvedValue({
                recordset: []
            });

            const result = await userService.getUserByAuth0Id('auth0|nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getUserById', () => {
        it('should return user if found', async () => {
            const user = {
                id: 42,
                auth0_id: 'auth0|123456',
                email: 'test@example.com',
                naam: 'Test User'
            };

            mockDb.executeQuery = jest.fn().mockResolvedValue({
                recordset: [user]
            });

            const result = await userService.getUserById(42);

            expect(result).toEqual({
                id: 42,
                auth0Id: 'auth0|123456',
                email: 'test@example.com',
                naam: 'Test User'
            });
        });

        it('should return null if user not found', async () => {
            mockDb.executeQuery = jest.fn().mockResolvedValue({
                recordset: []
            });

            const result = await userService.getUserById(999);

            expect(result).toBeNull();
        });
    });
});