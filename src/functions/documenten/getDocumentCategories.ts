import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DocumentCategorieRepository } from '../../repositories/DocumentCategorieRepository';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * GET /api/document-categorieen
 *
 * Returns all active document categories.
 * No authentication required (public endpoint for category selection UI).
 */
export async function getDocumentCategories(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Document Categories endpoint called');

    try {
        const repository = new DocumentCategorieRepository();
        const categories = await repository.findAllActive();

        return createSuccessResponse(categories);
    } catch (error) {
        context.error('Error fetching document categories:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to fetch document categories',
            500
        );
    }
}

app.http('getDocumentCategories', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookup/document-categorieen',
    handler: getDocumentCategories,
});
