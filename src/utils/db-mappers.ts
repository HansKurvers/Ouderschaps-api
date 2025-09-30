import {
    DossierDbDto,
    Dossier,
    Persoon,
    PersoonDbDto,
    OuderschapsplanInfo,
    OuderschapsplanInfoDbDto,
} from '../models/Dossier';

export class DbMappers {
    static toDossier(dto: DossierDbDto): Dossier {
        return {
            id: dto.id!,
            dossierNummer: dto.dossier_nummer,
            gebruikerId: dto.gebruiker_id,
            status: dto.status,
            isAnoniem: dto.is_anoniem,
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

            return {
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
                nationaliteit1: dto.nationaliteit_1,
                nationaliteit2: dto.nationaliteit_2,
                telefoon: dto.telefoon,
                email: dto.email,
                beroep: dto.beroep,
            };
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
            nationaliteit_1: persoon.nationaliteit1,
            nationaliteit_2: persoon.nationaliteit2,
            telefoon: persoon.telefoon,
            email: persoon.email,
            beroep: persoon.beroep,
        };
    }

    static toOuderschapsplanInfo(dto: OuderschapsplanInfoDbDto): OuderschapsplanInfo {
        return {
            id: dto.id!,
            dossierId: dto.dossier_id,
            partij1PersoonId: dto.partij_1_persoon_id,
            partij2PersoonId: dto.partij_2_persoon_id,
            soortRelatie: dto.soort_relatie,
            soortRelatieVerbreking: dto.soort_relatie_verbreking,
            betrokkenheidKind: dto.betrokkenheid_kind,
            kiesplan: dto.kiesplan,
            gezagPartij: dto.gezag_partij as 1 | 2 | undefined,
            waOpNaamVanPartij: dto.wa_op_naam_van_partij as 1 | 2 | undefined,
            keuzeDevices: dto.keuze_devices,
            zorgverzekeringOpNaamVanPartij: dto.zorgverzekering_op_naam_van_partij as 1 | 2 | undefined,
            kinderbijslagPartij: dto.kinderbijslag_partij as 1 | 2 | 3 | undefined,
            brpPartij1: dto.brp_partij_1 ? JSON.parse(dto.brp_partij_1) as number[] : undefined,
            brpPartij2: dto.brp_partij_2 ? JSON.parse(dto.brp_partij_2) as number[] : undefined,
            kgbPartij1: dto.kgb_partij_1 ? JSON.parse(dto.kgb_partij_1) as number[] : undefined,
            kgbPartij2: dto.kgb_partij_2 ? JSON.parse(dto.kgb_partij_2) as number[] : undefined,
            hoofdverblijf: dto.hoofdverblijf,
            zorgverdeling: dto.zorgverdeling,
            opvangKinderen: dto.opvang_kinderen,
            bankrekeningnummersOpNaamVanKind: dto.bankrekeningnummers_op_naam_van_kind,
            parentingCoordinator: dto.parenting_coordinator,
            datumAanvangRelatie: dto.datum_aanvang_relatie,
            overeenkomstGemaakt: dto.overeenkomst_gemaakt,
            plaatsRelatie: dto.plaats_relatie,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
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
            wa_op_naam_van_partij: info.waOpNaamVanPartij,
            keuze_devices: info.keuzeDevices,
            zorgverzekering_op_naam_van_partij: info.zorgverzekeringOpNaamVanPartij,
            kinderbijslag_partij: info.kinderbijslagPartij,
            brp_partij_1: info.brpPartij1 ? JSON.stringify(info.brpPartij1) : undefined,
            brp_partij_2: info.brpPartij2 ? JSON.stringify(info.brpPartij2) : undefined,
            kgb_partij_1: info.kgbPartij1 ? JSON.stringify(info.kgbPartij1) : undefined,
            kgb_partij_2: info.kgbPartij2 ? JSON.stringify(info.kgbPartij2) : undefined,
            hoofdverblijf: info.hoofdverblijf,
            zorgverdeling: info.zorgverdeling,
            opvang_kinderen: info.opvangKinderen,
            bankrekeningnummers_op_naam_van_kind: info.bankrekeningnummersOpNaamVanKind,
            parenting_coordinator: info.parentingCoordinator,
            datum_aanvang_relatie: info.datumAanvangRelatie,
            overeenkomst_gemaakt: info.overeenkomstGemaakt,
            plaats_relatie: info.plaatsRelatie,
            created_at: info.createdAt,
            updated_at: info.updatedAt,
        };
    }

}
