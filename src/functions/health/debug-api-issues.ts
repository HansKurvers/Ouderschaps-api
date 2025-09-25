import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

export async function debugApiIssues(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('Debug API Issues endpoint called');
    const dbService = new DossierDatabaseService();

    try {
        const results: any = {
            timestamp: new Date().toISOString(),
            tests: {}
        };

        // Test 1: Authentication
        try {
            const userId = await requireAuthentication(request);
            results.tests.authentication = {
                status: 'SUCCESS',
                userId: userId,
                message: `User authenticated successfully with ID: ${userId}`
            };
        } catch (authError) {
            results.tests.authentication = {
                status: 'FAILED',
                error: authError instanceof Error ? authError.message : String(authError),
                message: 'Authentication failed'
            };
            // Return early if auth fails
            return createSuccessResponse(results);
        }

        const userId = await requireAuthentication(request);

        // Test 2: Database Connection
        try {
            await dbService.initialize();
            results.tests.databaseConnection = {
                status: 'SUCCESS',
                message: 'Database connection established successfully'
            };
        } catch (dbError) {
            results.tests.databaseConnection = {
                status: 'FAILED',
                error: dbError instanceof Error ? dbError.message : String(dbError),
                message: 'Database connection failed'
            };
        }

        // Test 3: User's Dossiers
        try {
            const userDossiers = await dbService.getAllDossiers(userId);
            results.tests.userDossiers = {
                status: 'SUCCESS',
                count: userDossiers.length,
                dossiers: userDossiers.map(d => ({
                    id: d.id,
                    dossierNummer: d.dossierNummer,
                    status: d.status,
                    isAnoniem: d.isAnoniem
                })),
                message: `Found ${userDossiers.length} dossiers for user`
            };
        } catch (error) {
            results.tests.userDossiers = {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch user dossiers'
            };
        }

        // Test 4: User's Persons
        try {
            const userPersons = await dbService.getAllPersonenForUser(userId, 50, 0);
            results.tests.userPersons = {
                status: 'SUCCESS',
                total: userPersons.total,
                data: userPersons.data.map(p => ({
                    id: p.id,
                    achternaam: p.achternaam,
                    voornamen: p.voornamen,
                    email: p.email
                })),
                message: `Found ${userPersons.total} persons for user`
            };
        } catch (error) {
            results.tests.userPersons = {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch user persons'
            };
        }

        // Test 4b: Try alternative method - persons via dossier relationships
        try {
            const userPersonsViaDossiers = await dbService.getAllPersonenForUserViaDossiers(userId, 50, 0);
            results.tests.userPersonsViaDossiers = {
                status: 'SUCCESS',
                total: userPersonsViaDossiers.total,
                data: userPersonsViaDossiers.data.map(p => ({
                    id: p.id,
                    achternaam: p.achternaam,
                    voornamen: p.voornamen,
                    email: p.email
                })),
                message: `Found ${userPersonsViaDossiers.total} persons via dossier relationships`
            };
        } catch (error) {
            results.tests.userPersonsViaDossiers = {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch user persons via dossier relationships'
            };
        }

        // Test 4c: Check if ANY persons exist in database
        try {
            await dbService.initialize();
            const pool = await (dbService as any).getPool();
            const request = pool.request();

            const allPersonsResult = await request.query(`
                SELECT COUNT(*) as total_persons,
                       COUNT(DISTINCT gebruiker_id) as unique_users,
                       STRING_AGG(CAST(gebruiker_id as VARCHAR), ', ') as all_user_ids
                FROM dbo.personen
            `);

            const userPersonsResult = await request.query(`
                SELECT COUNT(*) as user_persons
                FROM dbo.personen
                WHERE gebruiker_id = ${userId}
            `);

            results.tests.personenDatabaseAnalysis = {
                status: 'SUCCESS',
                totalPersonsInDb: allPersonsResult.recordset[0].total_persons,
                uniqueUsersWithPersons: allPersonsResult.recordset[0].unique_users,
                allUserIds: allPersonsResult.recordset[0].all_user_ids,
                currentUserPersons: userPersonsResult.recordset[0].user_persons,
                message: `Database analysis: ${allPersonsResult.recordset[0].total_persons} total persons, current user has ${userPersonsResult.recordset[0].user_persons}`
            };
        } catch (error) {
            results.tests.personenDatabaseAnalysis = {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to analyze personen database'
            };
        }

        // Test 5: Specific Dossier Access (1013 mentioned in the issue)
        try {
            const hasAccess1013 = await dbService.checkDossierAccess(1013, userId);
            results.tests.dossier1013Access = {
                status: hasAccess1013 ? 'SUCCESS' : 'NO_ACCESS',
                hasAccess: hasAccess1013,
                message: hasAccess1013 ? 'User has access to dossier 1013' : 'User does NOT have access to dossier 1013'
            };

            if (hasAccess1013) {
                try {
                    const partijen = await dbService.getPartijListWithId(1013);
                    results.tests.dossier1013Partijen = {
                        status: 'SUCCESS',
                        count: partijen.length,
                        partijen: partijen.map(p => ({
                            id: p.id,
                            persoonId: p.persoon.id,
                            naam: `${p.persoon.voornamen} ${p.persoon.achternaam}`,
                            rol: p.rol.naam
                        })),
                        message: `Retrieved ${partijen.length} partijen for dossier 1013`
                    };
                } catch (error) {
                    results.tests.dossier1013Partijen = {
                        status: 'FAILED',
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch partijen for dossier 1013'
                    };
                }
            }
        } catch (error) {
            results.tests.dossier1013Access = {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to check access to dossier 1013'
            };
        }

        // Test 6: Specific Dossier Omgang (39 mentioned in the issue)
        try {
            const hasAccess39 = await dbService.checkDossierAccess(39, userId);
            results.tests.dossier39Access = {
                status: hasAccess39 ? 'SUCCESS' : 'NO_ACCESS',
                hasAccess: hasAccess39,
                message: hasAccess39 ? 'User has access to dossier 39' : 'User does NOT have access to dossier 39'
            };

            if (hasAccess39) {
                try {
                    const omgang = await dbService.getOmgangByDossier(39);
                    results.tests.dossier39Omgang = {
                        status: 'SUCCESS',
                        count: omgang.length,
                        message: `Retrieved ${omgang.length} omgang entries for dossier 39`
                    };
                } catch (error) {
                    results.tests.dossier39Omgang = {
                        status: 'FAILED',
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch omgang for dossier 39'
                    };
                }
            }
        } catch (error) {
            results.tests.dossier39Access = {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to check access to dossier 39'
            };
        }

        return createSuccessResponse(results);

    } catch (error) {
        context.error('Error in debugApiIssues:', error);
        return createErrorResponse('Debug endpoint failed: ' + (error instanceof Error ? error.message : String(error)), 500);
    } finally {
        await dbService.close();
    }
}

app.http('debugApiIssues', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'debug/api-issues',
    handler: debugApiIssues,
});