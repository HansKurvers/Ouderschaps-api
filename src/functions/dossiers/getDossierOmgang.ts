import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { OmgangRepository } from '../../repositories/OmgangRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import { OmgangLegacy } from '../../models/Dossier';

export async function getDossierOmgang(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const useRepositoryPattern = process.env.USE_REPOSITORY_PATTERN === 'true';
    const dbService = useRepositoryPattern ? null : new DossierDatabaseService();
    const omgangRepository = useRepositoryPattern ? new OmgangRepository() : null;
    const dossierRepository = useRepositoryPattern ? new DossierRepository() : null;

    try {
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        if (!useRepositoryPattern && dbService) {
            try {
                await dbService.initialize();
                context.log('Database connection initialized successfully');
            } catch (dbError) {
                context.error('Database initialization failed in getDossierOmgang:', dbError);
                return createErrorResponse('Database connection failed', 500);
            }
        }

        // Check dossier access
        let hasAccess = false;
        if (useRepositoryPattern && dossierRepository) {
            const dossier = await dossierRepository.findById(dossierId);
            hasAccess = dossier !== null && dossier.gebruikerId === userId;
        } else if (dbService) {
            hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        }

        context.log(`Dossier access check result: ${hasAccess}`);
        if (!hasAccess) {
            context.warn(`Access denied for user ${userId} to dossier ${dossierId}`);
            return createErrorResponse('Access denied to this dossier', 403);
        }

        let omgang: OmgangLegacy[] = [];
        if (useRepositoryPattern && omgangRepository) {
            const omgangWithLookups = await omgangRepository.findByDossierId(dossierId);
            
            // Convert OmgangWithLookups to OmgangLegacy format
            omgang = omgangWithLookups.map(item => ({
                id: item.omgang.id,
                // Flat ID fields for frontend compatibility
                dagId: item.dagId,
                dagdeelId: item.dagdeelId,
                verzorgerId: item.verzorgerId,
                weekRegelingId: item.weekRegelingId,
                // Nested objects for display
                dag: item.dag,
                dagdeel: item.dagdeel,
                verzorger: item.verzorger,
                wisselTijd: item.omgang.wisselTijd,
                weekRegeling: item.weekRegeling,
                weekRegelingAnders: item.omgang.weekRegelingAnders,
                aangemaaktOp: item.omgang.aangemaaktOp,
                gewijzigdOp: item.omgang.gewijzigdOp
            }));
        } else if (dbService) {
            omgang = await dbService.getOmgangByDossier(dossierId);
        }

        context.log(`Retrieved ${omgang.length} omgang entries for dossier ${dossierId}`);
        return createSuccessResponse(omgang);

    } catch (error) {
        context.error('Error in getDossierOmgang:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        if (!useRepositoryPattern && dbService) {
            await dbService.close();
        }
    }
}

app.http('getDossierOmgang', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang',
    handler: getDossierOmgang,
});