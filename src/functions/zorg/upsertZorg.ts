import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createErrorResponse, createSuccessResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';
import Joi from 'joi';


// Validation schema for upsert
const upsertZorgSchema = Joi.object({
    id: Joi.number().integer().positive().optional(),
    zorgCategorieId: Joi.number().integer().positive().required(),
    zorgSituatieId: Joi.number().integer().positive().required(),
    overeenkomst: Joi.string().min(1).max(5000).required(),
    situatieAnders: Joi.string().max(500).optional().allow('', null)
});

const upsertZorgBatchSchema = Joi.object({
    zorgregelingen: Joi.array().items(upsertZorgSchema).required()
});

export async function upsertZorg(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const zorgRepository = new ZorgRepository();
    const dossierRepository = new DossierRepository();

    try {
        // Authenticate user
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.error('Authentication failed:', authError);
            return createUnauthorizedResponse();
        }

        // Parse and validate parameters
        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Parse and validate request body
        const body = await request.json() as any;
        const { error, value } = upsertZorgBatchSchema.validate(body);
        if (error) {
            return createErrorResponse(
                `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        // Check dossier access
        const hasAccess = await dossierRepository.checkAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        // Process each zorg record
        const results: any[] = [];
        
        for (const zorgData of value.zorgregelingen) {
            if (zorgData.id) {
                // Update existing record
                try {
                    const updated = await zorgRepository.update(zorgData.id, {
                        zorgCategorieId: zorgData.zorgCategorieId,
                        zorgSituatieId: zorgData.zorgSituatieId,
                        overeenkomst: zorgData.overeenkomst,
                        situatieAnders: zorgData.situatieAnders,
                        gewijzigdDoor: userId
                    });
                    results.push(updated);
                } catch (updateError: any) {
                    // If record not found, create new one
                    if (updateError.message?.includes('not found')) {
                        const created = await zorgRepository.create({
                            dossierId,
                            zorgCategorieId: zorgData.zorgCategorieId,
                            zorgSituatieId: zorgData.zorgSituatieId,
                            overeenkomst: zorgData.overeenkomst,
                            situatieAnders: zorgData.situatieAnders,
                            aangemaaktDoor: userId
                        });
                        results.push(created);
                    } else {
                        throw updateError;
                    }
                }
            } else {
                // Create new record
                const created = await zorgRepository.create({
                    dossierId,
                    zorgCategorieId: zorgData.zorgCategorieId,
                    zorgSituatieId: zorgData.zorgSituatieId,
                    overeenkomst: zorgData.overeenkomst,
                    situatieAnders: zorgData.situatieAnders,
                    aangemaaktDoor: userId
                });
                results.push(created);
            }
        }

        context.log(`Upserted ${results.length} zorg records for dossier ${dossierId}`);
        
        // Get all zorg records for the dossier to return complete state
        const allZorg = await zorgRepository.findByDossierId(dossierId);
        return createSuccessResponse(allZorg, 200);

    } catch (error) {
        context.error('Error in upsertZorg:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('upsertZorg', {
    methods: ['POST', 'PUT'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/zorg/upsert',
    handler: upsertZorg,
});