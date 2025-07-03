export interface IDossier {
    DossierID: number;
    DossierNummer: string;
    GebruikerID: number;
    Status: string;
    LaatsteWijziging: Date;
    CreatedAt?: Date;
    UpdatedAt?: Date;
}

export interface IPerson {
    PersoonID: number;
    DossierID: number;
    PersoonType: 'Partij1' | 'Partij2';
    Voornaam?: string;
    Tussenvoegsel?: string;
    Achternaam?: string;
    Geboortedatum?: Date;
    Adres?: string;
    Postcode?: string;
    Woonplaats?: string;
    Telefoonnummer?: string;
    Email?: string;
    BSN?: string;
}

export interface IChild {
    KindID: number;
    DossierID: number;
    Volgorde: number;
    Voornaam?: string;
    Tussenvoegsel?: string;
    Achternaam?: string;
    Geboortedatum?: Date;
    Geslacht?: string;
    Bijzonderheden?: string;
}

export interface IOuderschapsplanGegevens {
    GegevenID: number;
    DossierID: number;
    VeldCode: string;
    VeldNaam: string;
    VeldWaarde?: string;
    CreatedAt?: Date;
    UpdatedAt?: Date;
}

export interface ICompleteDossierData {
    dossier: IDossier;
    persons: IPerson[];
    children: IChild[];
    ouderschapsplanGegevens: IOuderschapsplanGegevens[];
}