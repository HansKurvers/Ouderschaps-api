import sql from 'mssql';
import { getPool } from '../config/database';
import * as iconv from 'iconv-lite';

/**
 * DNB Pension Provider Sync Service
 *
 * Synchronizes pension providers from DNB (De Nederlandsche Bank) registers.
 * Downloads CSV files and upserts to the local database.
 *
 * DNB Sources:
 * - PWPNF: Pensioenfondsen (Pension funds)
 * - WFTPP: Premiepensioeninstellingen (Premium pension institutions - PPI)
 * - WFTVZ: Verzekeraars (Insurers) - filtered for pension-relevant ones
 */

interface DnbSource {
    url: string;
    bronCode: string;
    type: 'Pensioenfonds' | 'PPI' | 'Verzekeraar';
    nameColumn: string;
}

interface SyncResult {
    bron: string;
    recordsToegevoegd: number;
    recordsBijgewerkt: number;
    recordsGedeactiveerd: number;
    status: 'SUCCES' | 'FOUT' | 'WAARSCHUWING';
    foutmelding?: string;
    duurMs: number;
}

interface CombinedSyncResult {
    success: boolean;
    results: SyncResult[];
    totalAdded: number;
    totalUpdated: number;
    totalDeactivated: number;
}

const DNB_SOURCES: DnbSource[] = [
    {
        url: 'https://www.dnb.nl/nl-NL/registerdownload/csv/PWPNF',
        bronCode: 'DNB_PWPNF',
        type: 'Pensioenfonds',
        nameColumn: 'Naam' // DNB uses 'Naam' column
    },
    {
        url: 'https://www.dnb.nl/nl-NL/registerdownload/csv/WFTPP',
        bronCode: 'DNB_WFTPP',
        type: 'PPI',
        nameColumn: 'Naam'
    },
    {
        url: 'https://www.dnb.nl/nl-NL/registerdownload/csv/WFTVZ',
        bronCode: 'DNB_WFTVZ',
        type: 'Verzekeraar',
        nameColumn: 'Naam'
    }
];

export class DnbSyncService {
    /**
     * Downloads CSV from DNB
     * DNB CSVs are typically Windows-1252 encoded and semicolon-separated
     */
    private async downloadCsv(url: string): Promise<string> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download from ${url}: ${response.status} ${response.statusText}`);
        }

        // Get raw buffer for encoding conversion
        const buffer = Buffer.from(await response.arrayBuffer());

        // Try to decode as Windows-1252 (common for Dutch CSV files)
        try {
            return iconv.decode(buffer, 'win1252');
        } catch {
            // Fallback to UTF-8
            return buffer.toString('utf-8');
        }
    }

    /**
     * Parses CSV content (semicolon-separated)
     */
    private parseCsv(content: string): Array<Record<string, string>> {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return [];

        // First line is header
        const headers = this.parseCsvLine(lines[0]);
        const records: Array<Record<string, string>> = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i]);
            if (values.length >= headers.length) {
                const record: Record<string, string> = {};
                headers.forEach((header, index) => {
                    record[header.trim()] = values[index]?.trim() || '';
                });
                records.push(record);
            }
        }

        return records;
    }

    /**
     * Parses a single CSV line, handling quoted fields
     */
    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ';' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    /**
     * Syncs a single DNB source to the database
     */
    private async syncSource(source: DnbSource): Promise<SyncResult> {
        const startTime = Date.now();
        const result: SyncResult = {
            bron: source.bronCode,
            recordsToegevoegd: 0,
            recordsBijgewerkt: 0,
            recordsGedeactiveerd: 0,
            status: 'SUCCES',
            duurMs: 0
        };

        try {
            // Download and parse CSV
            const csvContent = await this.downloadCsv(source.url);
            const records = this.parseCsv(csvContent);

            if (records.length === 0) {
                result.status = 'WAARSCHUWING';
                result.foutmelding = 'Geen records gevonden in CSV';
                result.duurMs = Date.now() - startTime;
                return result;
            }

            const pool = await getPool();
            const namesFromDnb = new Set<string>();

            // Process each record
            for (const record of records) {
                const naam = record[source.nameColumn];
                if (!naam || naam.trim() === '') continue;

                const cleanNaam = naam.trim();
                namesFromDnb.add(cleanNaam);

                // Check if record exists
                const existingResult = await pool.request()
                    .input('naam', sql.NVarChar(255), cleanNaam)
                    .query('SELECT id, bron FROM dbo.pensioen_uitvoerders WHERE naam = @naam');

                const existing = existingResult.recordset[0];

                if (existing) {
                    // Only update if it was synced from DNB (don't overwrite HANDMATIG records)
                    if (existing.bron !== 'HANDMATIG') {
                        await pool.request()
                            .input('naam', sql.NVarChar(255), cleanNaam)
                            .input('type', sql.NVarChar(50), source.type)
                            .input('bron', sql.NVarChar(50), source.bronCode)
                            .input('dnbNaam', sql.NVarChar(255), cleanNaam)
                            .query(`
                                UPDATE dbo.pensioen_uitvoerders
                                SET type = @type,
                                    bron = @bron,
                                    dnb_naam = @dnbNaam,
                                    is_actief = 1,
                                    laatst_gesynchroniseerd = GETDATE(),
                                    gewijzigd_op = GETDATE()
                                WHERE naam = @naam
                            `);
                        result.recordsBijgewerkt++;
                    }
                } else {
                    // Insert new record
                    await pool.request()
                        .input('naam', sql.NVarChar(255), cleanNaam)
                        .input('type', sql.NVarChar(50), source.type)
                        .input('bron', sql.NVarChar(50), source.bronCode)
                        .input('dnbNaam', sql.NVarChar(255), cleanNaam)
                        .input('volgorde', sql.Int, 50) // Default order for DNB records
                        .query(`
                            INSERT INTO dbo.pensioen_uitvoerders (naam, type, bron, dnb_naam, volgorde, is_actief, laatst_gesynchroniseerd)
                            VALUES (@naam, @type, @bron, @dnbNaam, @volgorde, 1, GETDATE())
                        `);
                    result.recordsToegevoegd++;
                }
            }

            // Deactivate records from this source that are no longer in DNB
            // (but never deactivate HANDMATIG records or "Anders")
            if (namesFromDnb.size > 0) {
                // Get all currently active records from this source
                const allActiveFromSource = await pool.request()
                    .input('bron', sql.NVarChar(50), source.bronCode)
                    .query(`
                        SELECT naam FROM dbo.pensioen_uitvoerders
                        WHERE bron = @bron AND is_actief = 1 AND naam != 'Anders'
                    `);

                for (const row of allActiveFromSource.recordset) {
                    if (!namesFromDnb.has(row.naam)) {
                        await pool.request()
                            .input('naam', sql.NVarChar(255), row.naam)
                            .query(`
                                UPDATE dbo.pensioen_uitvoerders
                                SET is_actief = 0, gewijzigd_op = GETDATE()
                                WHERE naam = @naam
                            `);
                        result.recordsGedeactiveerd++;
                    }
                }
            }

            result.duurMs = Date.now() - startTime;
            return result;

        } catch (error) {
            result.status = 'FOUT';
            result.foutmelding = error instanceof Error ? error.message : 'Unknown error';
            result.duurMs = Date.now() - startTime;
            return result;
        }
    }

    /**
     * Logs sync result to the database
     */
    private async logSyncResult(result: SyncResult): Promise<void> {
        try {
            const pool = await getPool();
            await pool.request()
                .input('bron', sql.NVarChar(50), result.bron)
                .input('recordsToegevoegd', sql.Int, result.recordsToegevoegd)
                .input('recordsBijgewerkt', sql.Int, result.recordsBijgewerkt)
                .input('recordsGedeactiveerd', sql.Int, result.recordsGedeactiveerd)
                .input('status', sql.NVarChar(20), result.status)
                .input('foutmelding', sql.NVarChar(sql.MAX), result.foutmelding || null)
                .input('duurMs', sql.Int, result.duurMs)
                .query(`
                    INSERT INTO dbo.pensioen_uitvoerders_sync_log
                    (bron, records_toegevoegd, records_bijgewerkt, records_gedeactiveerd, status, foutmelding, duur_ms)
                    VALUES (@bron, @recordsToegevoegd, @recordsBijgewerkt, @recordsGedeactiveerd, @status, @foutmelding, @duurMs)
                `);
        } catch (error) {
            console.error('Failed to log sync result:', error);
        }
    }

    /**
     * Syncs all DNB sources
     */
    async syncAll(): Promise<CombinedSyncResult> {
        const results: SyncResult[] = [];
        let totalAdded = 0;
        let totalUpdated = 0;
        let totalDeactivated = 0;

        for (const source of DNB_SOURCES) {
            const result = await this.syncSource(source);
            results.push(result);

            // Log each result
            await this.logSyncResult(result);

            // Accumulate totals
            totalAdded += result.recordsToegevoegd;
            totalUpdated += result.recordsBijgewerkt;
            totalDeactivated += result.recordsGedeactiveerd;
        }

        const success = results.every(r => r.status !== 'FOUT');

        return {
            success,
            results,
            totalAdded,
            totalUpdated,
            totalDeactivated
        };
    }

    /**
     * Syncs a specific DNB source by bron code
     */
    async syncBySource(bronCode: string): Promise<SyncResult | null> {
        const source = DNB_SOURCES.find(s => s.bronCode === bronCode);
        if (!source) {
            return null;
        }

        const result = await this.syncSource(source);
        await this.logSyncResult(result);
        return result;
    }

    /**
     * Gets the last sync status for each source
     */
    async getLastSyncStatus(): Promise<Array<{
        bron: string;
        laatsteSyncDatum: Date | null;
        status: string | null;
        recordsToegevoegd: number;
        recordsBijgewerkt: number;
        recordsGedeactiveerd: number;
    }>> {
        const pool = await getPool();
        const result = await pool.request().query(`
            WITH RankedLogs AS (
                SELECT
                    bron,
                    sync_datum,
                    status,
                    records_toegevoegd,
                    records_bijgewerkt,
                    records_gedeactiveerd,
                    ROW_NUMBER() OVER (PARTITION BY bron ORDER BY sync_datum DESC) as rn
                FROM dbo.pensioen_uitvoerders_sync_log
            )
            SELECT
                bron,
                sync_datum as laatsteSyncDatum,
                status,
                records_toegevoegd as recordsToegevoegd,
                records_bijgewerkt as recordsBijgewerkt,
                records_gedeactiveerd as recordsGedeactiveerd
            FROM RankedLogs
            WHERE rn = 1
            ORDER BY bron
        `);

        return result.recordset;
    }
}

export const dnbSyncService = new DnbSyncService();
