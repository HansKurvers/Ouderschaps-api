import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import connectDB from "../config/database";
import { Dossier } from "../models/Dossier";

export async function getDossiers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('GET Dossiers endpoint called');
    
    try {
        await connectDB();
        
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');
        
        const query: any = {};
        if (status) query.status = status;
        if (priority) query.priority = priority;
        
        const dossiers = await Dossier.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset);
            
        const total = await Dossier.countDocuments(query);
        
        return {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: true,
                data: dossiers,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
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
    }
}

app.http('getDossiers', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers',
    handler: getDossiers
});