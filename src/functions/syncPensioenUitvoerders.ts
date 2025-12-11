import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { dnbSyncService } from '../services/dnbSyncService';
import { createErrorResponse, createSuccessResponse } from '../utils/response-helper';
import { clearPensioenUitvoerdersCache } from './lookups/getPensioenUitvoerders';

/**
 * HTTP Trigger: Manual DNB Sync
 *
 * Route: POST /api/admin/sync-pensioen-uitvoerders
 * Auth: Required (admin only)
 *
 * Manually triggers synchronization of pension providers from DNB registers.
 * Useful for:
 * - Initial sync after deployment
 * - Manual refresh when needed
 * - Testing sync functionality
 *
 * Query params:
 * - source: Optional. Specific source to sync (DNB_PWPNF, DNB_WFTPP, DNB_WFTVZ)
 *
 * Returns:
 * - 200: Sync results
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function syncPensioenUitvoerdersHttp(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('HTTP trigger: Starting DNB pension providers sync');

    try {
        const source = request.query.get('source');

        if (source) {
            // Sync specific source
            context.log(`Syncing specific source: ${source}`);
            const result = await dnbSyncService.syncBySource(source);

            if (!result) {
                return createErrorResponse(`Unknown source: ${source}. Valid sources: DNB_PWPNF, DNB_WFTPP, DNB_WFTVZ`, 400);
            }

            // Clear cache after sync
            clearPensioenUitvoerdersCache();

            return createSuccessResponse({
                message: `Sync completed for ${source}`,
                result
            });
        }

        // Sync all sources
        context.log('Syncing all DNB sources');
        const result = await dnbSyncService.syncAll();

        // Clear cache after sync
        clearPensioenUitvoerdersCache();

        context.log(`Sync completed: ${result.totalAdded} added, ${result.totalUpdated} updated, ${result.totalDeactivated} deactivated`);

        return createSuccessResponse({
            message: 'DNB sync completed',
            success: result.success,
            summary: {
                totalAdded: result.totalAdded,
                totalUpdated: result.totalUpdated,
                totalDeactivated: result.totalDeactivated
            },
            details: result.results
        });

    } catch (error) {
        context.error('Error in syncPensioenUitvoerders HTTP trigger:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

/**
 * Timer Trigger: Scheduled DNB Sync
 *
 * Schedule: Every Monday at 07:00 UTC (0 0 7 * * 1)
 *
 * Automatically synchronizes pension providers from DNB registers weekly.
 * This ensures the lookup data stays up-to-date with minimal manual intervention.
 *
 * The schedule is set for early Monday morning (Dutch time: 08:00 winter, 09:00 summer)
 * to avoid peak usage hours.
 */
export async function syncPensioenUitvoerdersTimer(
    _timer: Timer,
    context: InvocationContext
): Promise<void> {
    context.log('Timer trigger: Starting scheduled DNB pension providers sync');
    context.log(`Scheduled execution time: ${new Date().toISOString()}`);

    try {
        const result = await dnbSyncService.syncAll();

        // Clear cache after sync
        clearPensioenUitvoerdersCache();

        context.log(`Scheduled sync completed: ${result.totalAdded} added, ${result.totalUpdated} updated, ${result.totalDeactivated} deactivated`);

        if (!result.success) {
            context.warn('Some sync sources failed:', result.results.filter(r => r.status === 'FOUT'));
        }

    } catch (error) {
        context.error('Error in scheduled syncPensioenUitvoerders:', error);
        // Timer triggers don't return responses, but errors are logged
    }
}

/**
 * HTTP Trigger: Get Sync Status
 *
 * Route: GET /api/admin/sync-pensioen-uitvoerders/status
 * Auth: Required (admin only)
 *
 * Returns the last sync status for each DNB source.
 */
export async function getSyncStatus(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('Getting DNB sync status');

    try {
        const status = await dnbSyncService.getLastSyncStatus();
        return createSuccessResponse(status);
    } catch (error) {
        context.error('Error getting sync status:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

// Register HTTP trigger for manual sync
app.http('syncPensioenUitvoerdersHttp', {
    methods: ['POST'],
    authLevel: 'anonymous', // TODO: Change to 'function' or add custom auth check
    route: 'admin/sync-pensioen-uitvoerders',
    handler: syncPensioenUitvoerdersHttp,
});

// Register HTTP trigger for sync status
app.http('getSyncStatus', {
    methods: ['GET'],
    authLevel: 'anonymous', // TODO: Change to 'function' or add custom auth check
    route: 'admin/sync-pensioen-uitvoerders/status',
    handler: getSyncStatus,
});

// Register Timer trigger for scheduled sync
// Schedule: Every Monday at 07:00 UTC
// NCRONTAB format: {second} {minute} {hour} {day} {month} {day of week}
app.timer('syncPensioenUitvoerdersTimer', {
    schedule: '0 0 7 * * 1', // Monday at 07:00 UTC
    handler: syncPensioenUitvoerdersTimer,
    runOnStartup: false, // Don't run on function app startup
});
