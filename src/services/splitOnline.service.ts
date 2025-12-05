/**
 * Split-Online Service
 * Handles API communication with Split-Online for dossier export
 */

import sql from 'mssql';
import { getPool } from '../config/database';
import { mapToAfdDocument } from '../mappers/afdMapper';
import {
    AfdDocument,
    DossierExportData,
    PartijData,
    KindData,
    SplitOnlineApiResponse,
} from '../types/splitOnline.types';

const SPLIT_ONLINE_API_URL = 'https://www.split-online.nl/api/dossiers.json';
const SPLIT_ONLINE_BASE_URL = 'https://www.split-online.nl';

export class SplitOnlineService {
    /**
     * Get the Split-Online API key for a user
     */
    async getApiKey(userId: number): Promise<string | null> {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT apikey_splitonline
                FROM dbo.gebruikers
                WHERE id = @userId
            `);

        if (result.recordset.length === 0) {
            return null;
        }

        return result.recordset[0].apikey_splitonline || null;
    }

    /**
     * Get dossier data for export, including partijen and kinderen
     */
    async getDossierExportData(dossierId: number, userId: number): Promise<DossierExportData | null> {
        const pool = await getPool();

        // First check if user has access to this dossier
        const accessCheck = await pool.request()
            .input('dossierId', sql.Int, dossierId)
            .input('userId', sql.Int, userId)
            .query(`
                SELECT d.id, d.dossier_nummer
                FROM dbo.dossiers d
                LEFT JOIN dbo.gedeelde_dossiers gd ON d.id = gd.dossier_id
                WHERE d.id = @dossierId
                  AND (d.gebruiker_id = @userId OR gd.gebruiker_id = @userId)
            `);

        if (accessCheck.recordset.length === 0) {
            return null;
        }

        const dossier = accessCheck.recordset[0];

        // Get partij 1 and partij 2 from ouderschapsplan_info
        const partijen = await this.getPartijen(dossierId);

        // Get kinderen
        const kinderen = await this.getKinderen(dossierId);

        return {
            dossier: {
                id: dossier.id,
                dossierNummer: dossier.dossier_nummer,
            },
            partij1: partijen.partij1,
            partij2: partijen.partij2,
            kinderen,
        };
    }

    /**
     * Get partij 1 and partij 2 from ouderschapsplan_info
     */
    private async getPartijen(dossierId: number): Promise<{ partij1: PartijData | null; partij2: PartijData | null }> {
        const pool = await getPool();

        // First try to get from ouderschapsplan_info (explicit partij 1/2 assignment)
        const infoResult = await pool.request()
            .input('dossierId', sql.Int, dossierId)
            .query(`
                SELECT partij_1_persoon_id, partij_2_persoon_id
                FROM dbo.ouderschapsplan_info
                WHERE dossier_id = @dossierId
            `);

        let partij1Id: number | null = null;
        let partij2Id: number | null = null;

        if (infoResult.recordset.length > 0) {
            partij1Id = infoResult.recordset[0].partij_1_persoon_id;
            partij2Id = infoResult.recordset[0].partij_2_persoon_id;
        } else {
            // Fallback: use first two partijen from dossiers_partijen (sorted by rol_id)
            const partijenResult = await pool.request()
                .input('dossierId', sql.Int, dossierId)
                .query(`
                    SELECT TOP 2 dp.persoon_id
                    FROM dbo.dossiers_partijen dp
                    JOIN dbo.rollen r ON dp.rol_id = r.id
                    WHERE dp.dossier_id = @dossierId
                    ORDER BY r.id
                `);

            if (partijenResult.recordset.length >= 1) {
                partij1Id = partijenResult.recordset[0].persoon_id;
            }
            if (partijenResult.recordset.length >= 2) {
                partij2Id = partijenResult.recordset[1].persoon_id;
            }
        }

        // Fetch person data for partij 1
        const partij1 = partij1Id ? await this.getPersoonData(partij1Id) : null;

        // Fetch person data for partij 2
        const partij2 = partij2Id ? await this.getPersoonData(partij2Id) : null;

        return { partij1, partij2 };
    }

    /**
     * Get person data by ID
     */
    private async getPersoonData(persoonId: number): Promise<PartijData | null> {
        const pool = await getPool();
        const result = await pool.request()
            .input('persoonId', sql.Int, persoonId)
            .query(`
                SELECT
                    id,
                    voornamen,
                    roepnaam,
                    tussenvoegsel,
                    achternaam,
                    geslacht,
                    geboorte_datum,
                    geboorteplaats,
                    adres,
                    postcode,
                    plaats,
                    telefoon,
                    email
                FROM dbo.personen
                WHERE id = @persoonId
            `);

        if (result.recordset.length === 0) {
            return null;
        }

        const p = result.recordset[0];
        return {
            id: p.id,
            voornamen: p.voornamen || '',
            roepnaam: p.roepnaam || '',
            tussenvoegsel: p.tussenvoegsel || '',
            achternaam: p.achternaam || '',
            geslacht: p.geslacht || '',
            geboorteDatum: p.geboorte_datum,
            geboorteplaats: p.geboorteplaats || '',
            adres: p.adres || '',
            postcode: p.postcode || '',
            plaats: p.plaats || '',
            telefoon: p.telefoon || '',
            email: p.email || '',
        };
    }

    /**
     * Get children for a dossier
     */
    private async getKinderen(dossierId: number): Promise<KindData[]> {
        const pool = await getPool();
        const result = await pool.request()
            .input('dossierId', sql.Int, dossierId)
            .query(`
                SELECT
                    p.id,
                    p.voornamen,
                    p.roepnaam,
                    p.tussenvoegsel,
                    p.achternaam,
                    p.geslacht,
                    p.geboorte_datum,
                    p.geboorteplaats
                FROM dbo.dossiers_kinderen dk
                JOIN dbo.personen p ON dk.kind_id = p.id
                WHERE dk.dossier_id = @dossierId
                ORDER BY p.geboorte_datum DESC
            `);

        return result.recordset.map(k => ({
            id: k.id,
            voornamen: k.voornamen || '',
            roepnaam: k.roepnaam || '',
            tussenvoegsel: k.tussenvoegsel || '',
            achternaam: k.achternaam || '',
            geslacht: k.geslacht || '',
            geboorteDatum: k.geboorte_datum,
            geboorteplaats: k.geboorteplaats || '',
        }));
    }

    /**
     * Send dossier data to Split-Online API
     */
    async sendToSplitOnline(data: DossierExportData, apiKey: string): Promise<SplitOnlineApiResponse> {
        // Map to AFD format
        const afdDocument: AfdDocument = mapToAfdDocument(data);

        try {
            const response = await fetch(SPLIT_ONLINE_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token token=${apiKey}`,
                },
                body: JSON.stringify(afdDocument),
            });

            // Handle different response statuses
            if (response.status === 201) {
                // Success - parse Location header
                const locationHeader = response.headers.get('Location');
                let url = '';
                let dossierId = '';

                if (locationHeader) {
                    // Location header format: /personalias/open?id=123738
                    url = `${SPLIT_ONLINE_BASE_URL}${locationHeader}`;

                    // Extract dossier ID from URL
                    const idMatch = locationHeader.match(/id=(\d+)/);
                    if (idMatch) {
                        dossierId = idMatch[1];
                    }
                }

                return {
                    success: true,
                    url,
                    dossierId,
                };
            }

            // Handle error responses
            let errorDetails = '';
            try {
                const errorBody = await response.text();
                errorDetails = errorBody;
            } catch {
                // Ignore parse errors
            }

            if (response.status === 400) {
                return {
                    success: false,
                    error: 'Ongeldige data verzonden naar Split-Online',
                    details: errorDetails,
                    statusCode: 400,
                };
            }

            if (response.status === 401) {
                return {
                    success: false,
                    error: 'Ongeldige Split-Online API key',
                    details: 'Controleer uw API key in uw profiel instellingen',
                    statusCode: 401,
                };
            }

            if (response.status === 404) {
                return {
                    success: false,
                    error: 'Split-Online API endpoint niet gevonden',
                    details: errorDetails,
                    statusCode: 404,
                };
            }

            // Generic server error
            return {
                success: false,
                error: `Split-Online fout (${response.status})`,
                details: errorDetails,
                statusCode: response.status,
            };
        } catch (error) {
            // Network or other errors
            return {
                success: false,
                error: 'Verbinding met Split-Online mislukt',
                details: error instanceof Error ? error.message : 'Onbekende fout',
                statusCode: 500,
            };
        }
    }

    /**
     * Export a dossier to Split-Online
     * Main entry point that orchestrates the full export process
     */
    async exportDossier(dossierId: number, userId: number): Promise<SplitOnlineApiResponse> {
        // 1. Get API key
        const apiKey = await this.getApiKey(userId);
        if (!apiKey) {
            return {
                success: false,
                error: 'Split-Online API key niet geconfigureerd',
                details: 'Configureer uw Split-Online API key in uw profiel instellingen',
                statusCode: 400,
            };
        }

        // 2. Get dossier data
        const dossierData = await this.getDossierExportData(dossierId, userId);
        if (!dossierData) {
            return {
                success: false,
                error: 'Dossier niet gevonden',
                details: 'Het dossier bestaat niet of u heeft geen toegang',
                statusCode: 404,
            };
        }

        // 3. Validate data completeness
        if (!dossierData.partij1 || !dossierData.partij2) {
            return {
                success: false,
                error: 'Dossier heeft niet beide partijen',
                details: 'Voeg beide partijen toe voordat u exporteert naar Split-Online',
                statusCode: 400,
            };
        }

        // 4. Send to Split-Online
        return await this.sendToSplitOnline(dossierData, apiKey);
    }
}
