import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function checkDuplicateZorg(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const zorgRepository = new ZorgRepository();

    try {
        // Authenticate user
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.error('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        
        // Check access via DossierRepository
        const { DossierRepository } = await import('../../repositories/DossierRepository');
        const dossierRepo = new DossierRepository();
        const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        // Get all zorg records grouped by situatie
        const query = `
            SELECT 
                z.zorg_situatie_id,
                zs.naam as situatie_naam,
                zc.naam as categorie_naam,
                COUNT(*) as aantal_records,
                STRING_AGG(CAST(z.id as VARCHAR), ', ') as zorg_ids,
                STRING_AGG(LEFT(z.overeenkomst, 50), ' | ') as overeenkomsten_preview
            FROM dbo.zorg z
            INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
            INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
            WHERE z.dossier_id = @dossierId
            GROUP BY z.zorg_situatie_id, zs.naam, zc.naam
            HAVING COUNT(*) > 1
            ORDER BY zc.naam, zs.naam
        `;

        const pool = await zorgRepository['getPool']();
        const duplicatesResult = await pool.request()
            .input('dossierId', dossierId)
            .query(query);
        
        const duplicates = duplicatesResult.recordset;

        // Get all records for detailed view
        const allRecordsQuery = `
            SELECT 
                z.*,
                zs.naam as situatie_naam,
                zc.naam as categorie_naam
            FROM dbo.zorg z
            INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
            INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
            WHERE z.dossier_id = @dossierId
            ORDER BY zc.naam, zs.naam, z.gewijzigd_op DESC
        `;

        const allRecordsResult = await pool.request()
            .input('dossierId', dossierId)
            .query(allRecordsQuery);
            
        const allRecords = allRecordsResult.recordset;

        const result = {
            dossierId,
            totalRecords: allRecords.length,
            duplicateGroups: duplicates,
            duplicateCount: duplicates.length,
            allRecords: allRecords.map(r => ({
                id: r.id,
                categorie: r.categorie_naam,
                situatie: r.situatie_naam,
                overeenkomst: r.overeenkomst?.substring(0, 100) + (r.overeenkomst?.length > 100 ? '...' : ''),
                aangemaaktOp: r.aangemaakt_op,
                gewijzigdOp: r.gewijzigd_op
            }))
        };

        return createSuccessResponse(result);

    } catch (error) {
        context.error('Error checking duplicate zorg:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('checkDuplicateZorg', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'debug/dossiers/{dossierId}/duplicate-zorg',
    handler: checkDuplicateZorg,
});