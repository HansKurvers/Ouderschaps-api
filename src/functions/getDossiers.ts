import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { DossierDatabaseService } from "../services/database-service";
import Joi from "joi";

const querySchema = Joi.object({
    userID: Joi.number().integer().positive().required(),
    status: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0)
});

export async function getDossiers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('GET Dossiers endpoint called');
    
    const service = new DossierDatabaseService();
    
    try {
        await service.initialize();
        
        const { searchParams } = new URL(request.url);
        const userID = parseInt(searchParams.get('userID') || '0');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');
        
        // Validate query parameters
        const { error, value } = querySchema.validate({
            userID,
            status,
            limit,
            offset
        });
        
        if (error) {
            return {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    success: false,
                    error: "Invalid query parameters",
                    details: error.details.map(d => d.message)
                })
            };
        }
        
        const { userID: validatedUserID, limit: validatedLimit, offset: validatedOffset } = value;
        
        // Get all dossiers for user
        let dossiers = await service.getAllDossiers(validatedUserID);
        
        // Apply status filter if provided
        if (status) {
            dossiers = dossiers.filter(d => d.Status === status);
        }
        
        // Apply pagination
        const total = dossiers.length;
        const paginatedDossiers = dossiers.slice(validatedOffset, validatedOffset + validatedLimit);
        
        return {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: true,
                data: paginatedDossiers,
                pagination: {
                    total,
                    limit: validatedLimit,
                    offset: validatedOffset,
                    hasMore: validatedOffset + validatedLimit < total
                }
            })
        };
        
    } catch (error) {
        context.error('Error fetching dossiers:', error);
        
        return {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: false,
                error: "Failed to fetch dossiers",
                message: error instanceof Error ? error.message : "Unknown error"
            })
        };
    } finally {
        await service.close();
    }
}

app.http('getDossiers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers',
    handler: getDossiers
});