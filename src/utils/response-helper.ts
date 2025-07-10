import { HttpResponseInit } from '@azure/functions';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export function createSuccessResponse<T>(data: T, statusCode: number = 200): HttpResponseInit {
    const response: ApiResponse<T> = {
        success: true,
        data
    };
    
    return {
        status: statusCode,
        body: JSON.stringify(response),
        headers: {
            'Content-Type': 'application/json'
        }
    };
}

export function createErrorResponse(error: string | Error, statusCode: number = 400): HttpResponseInit {
    const errorMessage = error instanceof Error ? error.message : error;
    
    const response: ApiResponse = {
        success: false,
        error: errorMessage
    };
    
    return {
        status: statusCode,
        body: JSON.stringify(response),
        headers: {
            'Content-Type': 'application/json'
        }
    };
}

export function createUnauthorizedResponse(): HttpResponseInit {
    return createErrorResponse('Unauthorized: Missing x-user-id header', 401);
}

export function createNotFoundResponse(resource: string): HttpResponseInit {
    return createErrorResponse(`${resource} not found`, 404);
}

export function createForbiddenResponse(): HttpResponseInit {
    return createErrorResponse('Forbidden: You do not have access to this resource', 403);
}