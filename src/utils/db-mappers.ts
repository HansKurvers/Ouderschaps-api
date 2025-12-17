import {
    DossierDbDto,
    Dossier,
    Persoon,
    PersoonDbDto,
    OuderschapsplanInfo,
    OuderschapsplanInfoDbDto,
    Alimentatie,
    Zorg,
    ZorgCategorie,
    ZorgSituatie,
    Omgang,
    Dag,
    Dagdeel,
    WeekRegeling,
    KinderrekeningIBAN,
} from '../models/Dossier';

export class DbMappers {
    /**
     * Safely parse JSON string with error handling
     * Returns undefined if parsing fails instead of throwing
     * @param json - JSON string to parse
     * @param fieldName - Field name for logging purposes
     * @returns Parsed object or undefined
     */
    private static parseJsonSafely<T>(json: string | null | undefined, fieldName: string = 'field'): T | undefined {
        if (!json) return undefined;

        // Handle empty strings
        if (json.trim() === '') return undefined;

        try {
            return JSON.parse(json) as T;
        } catch (error) {
            console.warn(`Failed to parse ${fieldName} JSON, returning undefined. Value: "${json.substring(0, 100)}${json.length > 100 ? '...' : ''}"`, error);
            return undefined;
        }
    }

    /**
     * Safely stringify value to JSON with error handling
     * Returns undefined if stringification fails instead of throwing
     * @param value - Value to stringify
     * @param fieldName - Field name for logging purposes
     * @returns JSON string or undefined
     */
    private static stringifyJsonSafely(value: any, fieldName: string = 'field'): string | undefined {
        if (value === null || value === undefined) return undefined;

        try {
            return JSON.stringify(value);
        } catch (error) {
            console.warn(`Failed to stringify ${fieldName} JSON, returning undefined`, error);
            return undefined;
        }
    }

    static toDossier(dto: DossierDbDto): Dossier {
        return {
            id: dto.id!,
            dossierNummer: dto.dossier_nummer,
            gebruikerId: dto.gebruiker_id,
            status: dto.status,
            isAnoniem: dto.is_anoniem,
            templateType: dto.template_type,
            aangemaaktOp: dto.aangemaakt_op!,
            gewijzigdOp: dto.gewijzigd_op!,
        };
    }

    static toDossierDto(dossier: Dossier): DossierDbDto {
        return {
            id: dossier.id,
            dossier_nummer: dossier.dossierNummer,
            gebruiker_id: dossier.gebruikerId,
            status: dossier.status,
            is_anoniem: dossier.isAnoniem,
            template_type: dossier.templateType,
            aangemaakt_op: dossier.aangemaaktOp,
            gewijzigd_op: dossier.gewijzigdOp,
        };
    }

    static toPersoon(dto: PersoonDbDto): Persoon {
        try {
            if (!dto.id) {
                throw new Error('Persoon ID is required but missing from database result');
            }
            if (!dto.achternaam) {
                throw new Error('Persoon achternaam is required but missing from database result');
            }

            const persoon: Persoon = {
                id: dto.id,
                voorletters: dto.voorletters,
                voornamen: dto.voornamen,
                roepnaam: dto.roepnaam,
                geslacht: dto.geslacht,
                tussenvoegsel: dto.tussenvoegsel,
                achternaam: dto.achternaam,
                adres: dto.adres,
                postcode: dto.postcode,
                plaats: dto.plaats,
                geboorteplaats: dto.geboorteplaats,
                geboorteDatum: dto.geboorte_datum,
                geboorteland: dto.geboorteland,
                nationaliteit1: dto.nationaliteit_1,
                nationaliteit2: dto.nationaliteit_2,
                telefoon: dto.telefoon,
                email: dto.email,
                beroep: dto.beroep,
                rolId: dto.rol_id,
            };

            // Add rol object if rol_naam is present
            if (dto.rol_id && dto.rol_naam) {
                persoon.rol = {
                    id: dto.rol_id,
                    naam: dto.rol_naam
                };
            }

            return persoon;
        } catch (error) {
            console.error('Error mapping Persoon from database:', error);
            console.error('Database DTO:', JSON.stringify(dto, null, 2));
            throw error;
        }
    }

    static toPersoonDto(persoon: Persoon): PersoonDbDto {
        // Support both camelCase and snake_case for compatibility
        const persoonAny = persoon as any;
        return {
            id: persoon.id,
            voorletters: persoon.voorletters,
            voornamen: persoon.voornamen,
            roepnaam: persoon.roepnaam,
            geslacht: persoon.geslacht,
            tussenvoegsel: persoon.tussenvoegsel,
            achternaam: persoon.achternaam,
            adres: persoon.adres,
            postcode: persoon.postcode,
            plaats: persoon.plaats,
            geboorteplaats: persoon.geboorteplaats || persoonAny.geboorte_plaats,
            geboorte_datum: persoon.geboorteDatum || persoonAny.geboorte_datum,
            geboorteland: persoon.geboorteland,
            nationaliteit_1: persoon.nationaliteit1,
            nationaliteit_2: persoon.nationaliteit2,
            telefoon: persoon.telefoon,
            email: persoon.email,
            beroep: persoon.beroep,
        };
    }

    static toOuderschapsplanInfo(dto: OuderschapsplanInfoDbDto, partij1Naam?: string, partij2Naam?: string): OuderschapsplanInfo {
        const info: OuderschapsplanInfo = {
            id: dto.id!,
            dossierId: dto.dossier_id,
            partij1PersoonId: dto.partij_1_persoon_id,
            partij2PersoonId: dto.partij_2_persoon_id,
            soortRelatie: dto.soort_relatie,
            soortRelatieVerbreking: dto.soort_relatie_verbreking,
            betrokkenheidKind: dto.betrokkenheid_kind,
            kiesplan: dto.kiesplan,
            gezagPartij: dto.gezag_partij as 1 | 2 | 3 | 4 | 5 | undefined,
            gezagTermijnWeken: dto.gezag_termijn_weken,
            woonplaatsOptie: dto.woonplaats_optie as 1 | 2 | 3 | 4 | 5 | undefined,
            woonplaatsPartij1: dto.woonplaats_partij1,
            woonplaatsPartij2: dto.woonplaats_partij2,
            waOpNaamVanPartij: dto.wa_op_naam_van_partij as 1 | 2 | undefined,
            keuzeDevices: dto.keuze_devices,
            zorgverzekeringOpNaamVanPartij: dto.zorgverzekering_op_naam_van_partij as 1 | 2 | undefined,
            kinderbijslagPartij: dto.kinderbijslag_partij as 1 | 2 | 3 | undefined,
            brpPartij1: this.parseJsonSafely<number[]>(dto.brp_partij_1, 'brpPartij1'),
            brpPartij2: this.parseJsonSafely<number[]>(dto.brp_partij_2, 'brpPartij2'),
            kgbPartij1: this.parseJsonSafely<number[]>(dto.kgb_partij_1, 'kgbPartij1'),
            kgbPartij2: this.parseJsonSafely<number[]>(dto.kgb_partij_2, 'kgbPartij2'),
            hoofdverblijf: dto.hoofdverblijf,
            zorgverdeling: dto.zorgverdeling,
            opvangKinderen: dto.opvang_kinderen,
            bankrekeningnummersOpNaamVanKind: this.parseJsonSafely<KinderrekeningIBAN[]>(dto.bankrekeningnummers_op_naam_van_kind, 'bankrekeningnummersOpNaamVanKind'),
            parentingCoordinator: dto.parenting_coordinator,
            datumAanvangRelatie: dto.datum_aanvang_relatie,
            overeenkomstGemaakt: dto.overeenkomst_gemaakt,
            plaatsRelatie: dto.plaats_relatie,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };

        // Generate computed placeholder fields for document generation
        // Import is done dynamically to avoid circular dependencies
        const { generateAllPlaceholders } = require('./ouderschapsplan-text-generator');
        const placeholders = generateAllPlaceholders(info, partij1Naam, partij2Naam);

        info.gezagZin = placeholders.gezagZin;
        info.relatieAanvangZin = placeholders.relatieAanvangZin;
        info.ouderschapsplanDoelZin = placeholders.ouderschapsplanDoelZin;

        return info;
    }

    static toOuderschapsplanInfoDto(info: OuderschapsplanInfo): OuderschapsplanInfoDbDto {
        return {
            id: info.id,
            dossier_id: info.dossierId,
            partij_1_persoon_id: info.partij1PersoonId,
            partij_2_persoon_id: info.partij2PersoonId,
            soort_relatie: info.soortRelatie,
            soort_relatie_verbreking: info.soortRelatieVerbreking,
            betrokkenheid_kind: info.betrokkenheidKind,
            kiesplan: info.kiesplan,
            gezag_partij: info.gezagPartij,
            gezag_termijn_weken: info.gezagTermijnWeken,
            woonplaats_optie: info.woonplaatsOptie,
            woonplaats_partij1: info.woonplaatsPartij1,
            woonplaats_partij2: info.woonplaatsPartij2,
            wa_op_naam_van_partij: info.waOpNaamVanPartij,
            keuze_devices: info.keuzeDevices,
            zorgverzekering_op_naam_van_partij: info.zorgverzekeringOpNaamVanPartij,
            kinderbijslag_partij: info.kinderbijslagPartij,
            brp_partij_1: this.stringifyJsonSafely(info.brpPartij1, 'brpPartij1'),
            brp_partij_2: this.stringifyJsonSafely(info.brpPartij2, 'brpPartij2'),
            kgb_partij_1: this.stringifyJsonSafely(info.kgbPartij1, 'kgbPartij1'),
            kgb_partij_2: this.stringifyJsonSafely(info.kgbPartij2, 'kgbPartij2'),
            hoofdverblijf: info.hoofdverblijf,
            zorgverdeling: info.zorgverdeling,
            opvang_kinderen: info.opvangKinderen,
            bankrekeningnummers_op_naam_van_kind: this.stringifyJsonSafely(info.bankrekeningnummersOpNaamVanKind, 'bankrekeningnummersOpNaamVanKind'),
            parenting_coordinator: info.parentingCoordinator,
            datum_aanvang_relatie: info.datumAanvangRelatie,
            overeenkomst_gemaakt: info.overeenkomstGemaakt,
            plaats_relatie: info.plaatsRelatie,
            created_at: info.createdAt,
            updated_at: info.updatedAt,
        };
    }

    static toAlimentatie(row: any): Alimentatie {
        return {
            id: row.id,
            dossierId: row.dossier_id,
            betalerId: row.betaler_id,
            ontvangerId: row.ontvanger_id,
            bedrag: parseFloat(row.bedrag),
            frequentie: row.frequentie,
            ingangsdatum: new Date(row.ingangsdatum),
            einddatum: row.einddatum ? new Date(row.einddatum) : undefined,
            opmerkingen: row.opmerkingen || undefined,
            aangemaaktOp: new Date(row.aangemaakt_op),
            gewijzigdOp: new Date(row.gewijzigd_op)
        };
    }

    static toZorg(row: any): Zorg {
        return {
            id: row.id,
            dossierId: row.dossier_id,
            zorgCategorieId: row.zorg_categorie_id,
            zorgSituatieId: row.zorg_situatie_id,
            overeenkomst: row.overeenkomst,
            situatieAnders: row.situatie_anders || undefined,
            isCustomText: row.is_custom_text === true || row.is_custom_text === 1,
            aangemaaktOp: new Date(row.aangemaakt_op),
            aangemaaktDoor: row.aangemaakt_door,
            gewijzigdOp: new Date(row.gewijzigd_op),
            gewijzigdDoor: row.gewijzigd_door || undefined
        };
    }

    static toZorgCategorie(row: any): ZorgCategorie {
        return {
            id: row.id,
            naam: row.naam
        };
    }

    static toZorgSituatie(row: any): ZorgSituatie {
        return {
            id: row.id,
            naam: row.naam,
            zorgCategorieId: row.zorg_categorie_id || undefined,
            defaultTemplateId: row.default_template_id ?? null
        };
    }

    static toOmgang(row: any): Omgang {
        return {
            id: row.id,
            dossierId: row.dossier_id,
            dagId: row.dag_id,
            dagdeelId: row.dagdeel_id,
            verzorgerId: row.verzorger_id,
            wisselTijd: row.wissel_tijd || undefined,
            weekRegelingId: row.week_regeling_id,
            weekRegelingAnders: row.week_regeling_anders || undefined,
            aangemaaktOp: new Date(row.aangemaakt_op),
            gewijzigdOp: new Date(row.gewijzigd_op)
        };
    }

    static toDag(row: any): Dag {
        return {
            id: row.id,
            naam: row.naam
        };
    }

    static toDagdeel(row: any): Dagdeel {
        return {
            id: row.id,
            naam: row.naam
        };
    }

    static toWeekRegeling(row: any): WeekRegeling {
        return {
            id: row.id,
            omschrijving: row.omschrijving
        };
    }

}
