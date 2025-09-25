import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

export async function testIssues(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        const results: any = {
            timestamp: new Date().toISOString(),
            tests: {}
        };

        // Test authentication
        let userId: number;
        try {
            userId = await requireAuthentication(request);
            results.tests.authentication = {
                status: 'SUCCESS',
                userId: userId
            };
        } catch (authError) {
            results.tests.authentication = {
                status: 'FAILED',
                error: authError instanceof Error ? authError.message : String(authError)
            };
            return createSuccessResponse(results);
        }

        await dbService.initialize();

        // Test 1: Check access to specific dossiers mentioned (1013, 1012, 1011, 1010)
        const dossierIds = [1013, 1012, 1011, 1010];
        results.tests.dossierAccess = {};

        for (const dossierId of dossierIds) {
            try {
                const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
                results.tests.dossierAccess[`dossier_${dossierId}`] = {
                    status: hasAccess ? 'SUCCESS' : 'NO_ACCESS',
                    hasAccess: hasAccess
                };
            } catch (error) {
                results.tests.dossierAccess[`dossier_${dossierId}`] = {
                    status: 'ERROR',
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        }

        // Test 2: Test delete access on dossier 44
        try {
            const hasDeleteAccess = await dbService.checkDossierAccess(44, userId);
            results.tests.deleteAccess = {
                status: hasDeleteAccess ? 'SUCCESS' : 'NO_ACCESS',
                hasAccess: hasDeleteAccess,
                dossierId: 44
            };

            if (hasDeleteAccess) {
                // Check if dossier exists
                try {
                    const dossier = await dbService.getDossierById(44);
                    results.tests.dossierExists = {
                        status: 'SUCCESS',
                        dossier: dossier ? {
                            id: dossier.id,
                            dossierNummer: dossier.dossierNummer,
                            status: dossier.status
                        } : null
                    };
                } catch (error) {
                    results.tests.dossierExists = {
                        status: 'ERROR',
                        error: error instanceof Error ? error.message : String(error)
                    };
                }
            }
        } catch (error) {
            results.tests.deleteAccess = {
                status: 'ERROR',
                error: error instanceof Error ? error.message : String(error)
            };
        }

        // Test 3: Get user's accessible dossiers
        try {
            const userDossiers = await dbService.getAllDossiers(userId);
            results.tests.userDossiers = {
                status: 'SUCCESS',
                count: userDossiers.length,
                dossierIds: userDossiers.map(d => d.id)
            };
        } catch (error) {
            results.tests.userDossiers = {
                status: 'ERROR',
                error: error instanceof Error ? error.message : String(error)
            };
        }

        return createSuccessResponse(results);

    } catch (error) {
        context.error('Error in testIssues:', error);
        return createErrorResponse('Test endpoint failed: ' + (error instanceof Error ? error.message : String(error)), 500);
    } finally {
        await dbService.close();
    }
}

app.http('testIssues', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'debug/test-issues',
    handler: testIssues,
});