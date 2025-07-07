import {
    DossierDbDto,
    IDossier,
    IOuderschapsplanGegevens,
    IPersoon,
    PersoonDbDto,
} from '../models/Dossier';

export class DbMappers {
    static toDossier(dto: DossierDbDto): IDossier {
        return {
            id: dto.id!,
            dossierNummer: dto.dossier_nummer,
            gebruikerId: dto.gebruiker_id,
            status: dto.status,
            aangemaaktOp: dto.aangemaakt_op!,
            gewijzigdOp: dto.gewijzigd_op!,
        };
    }

    static toDossierDto(dossier: IDossier): DossierDbDto {
        return {
            id: dossier.id,
            dossier_nummer: dossier.dossierNummer,
            gebruiker_id: dossier.gebruikerId,
            status: dossier.status,
            aangemaakt_op: dossier.aangemaaktOp,
            gewijzigd_op: dossier.gewijzigdOp,
        };
    }

    static toPersoon(dto: PersoonDbDto): IPersoon {
        return {
            id: dto.id!,
            voorletters: dto.voorletters,
            voornamen: dto.voornamen,
            roepnaam: dto.roepnaam,
            geslacht: dto.geslacht,
            tussenvoegsel: dto.tussenvoegsel,
            achternaam: dto.achternaam,
            adres: dto.adres,
            postcode: dto.postcode,
            plaats: dto.plaats,
            geboortePlaats: dto.geboorte_plaats,
            geboorteDatum: dto.geboorte_datum,
            nationaliteit1: dto.nationaliteit_1,
            nationaliteit2: dto.nationaliteit_2,
            telefoon: dto.telefoon,
            email: dto.email,
            beroep: dto.beroep,
        };
    }

    static toPersoonDto(persoon: IPersoon): PersoonDbDto {
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
            geboorte_plaats: persoon.geboortePlaats,
            geboorte_datum: persoon.geboorteDatum,
            nationaliteit_1: persoon.nationaliteit1,
            nationaliteit_2: persoon.nationaliteit2,
            telefoon: persoon.telefoon,
            email: persoon.email,
            beroep: persoon.beroep,
        };
    }

    static toOuderschapsplanGegevens(dto: any): IOuderschapsplanGegevens {
        return {
            id: dto.id,
            dossierId: dto.dossier_id,
            veldCode: dto.veld_code,
            veldNaam: dto.veld_naam,
            veldWaarde: dto.veld_waarde,
            aangemaaktOp: dto.aangemaakt_op,
            gewijzigdOp: dto.gewijzigd_op,
        };
    }
}
