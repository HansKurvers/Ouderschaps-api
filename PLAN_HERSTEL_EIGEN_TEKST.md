# Plan voor Herstel Eigen Tekst Functionaliteit

## Probleem
Bij het optimaliseren van de database hebben we alle "Eigen tekst invoeren" templates verwijderd. Hierdoor kan de frontend geen eigen tekst meer opslaan voor Feestdagen en Bijzondere dagen.

## Huidige Situatie

### Wat werkt wel:
- Feestdagen/Bijzondere dagen worden correct opgeslagen in `dbo.zorg` tabel
- Het `overeenkomst` veld kan eigen tekst bevatten
- API endpoints werken correct voor het opslaan van zorg items

### Wat werkt niet:
- Frontend heeft geen "Eigen tekst invoeren" optie meer
- 24 templates met "Eigen tekst invoeren" zijn verwijderd

## Oplossing

### Optie 1: Herstel "Eigen tekst invoeren" Templates (Aanbevolen)
Voeg voor elke categorie één "Eigen tekst invoeren" template toe:

```sql
-- Feestdagen
INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
VALUES 
('eigen_tekst_feestdag', 'Eigen tekst invoeren', 0, 'Feestdag', 'algemeen', 999),
('eigen_tekst_feestdag_meervoud', 'Eigen tekst invoeren', 1, 'Feestdag', 'algemeen', 999);

-- Vakantie
INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
VALUES 
('eigen_tekst_vakantie', 'Eigen tekst invoeren', 0, 'Vakantie', 'vakantie', 999),
('eigen_tekst_vakantie_meervoud', 'Eigen tekst invoeren', 1, 'Vakantie', 'vakantie', 999);

-- Bijzondere dagen (per subtype)
INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
VALUES 
('eigen_tekst_vaderdag', 'Eigen tekst invoeren', 0, 'Bijzondere dag', 'vaderdag', 999),
('eigen_tekst_vaderdag_meervoud', 'Eigen tekst invoeren', 1, 'Bijzondere dag', 'vaderdag', 999),
('eigen_tekst_moederdag', 'Eigen tekst invoeren', 0, 'Bijzondere dag', 'moederdag', 999),
('eigen_tekst_moederdag_meervoud', 'Eigen tekst invoeren', 1, 'Bijzondere dag', 'moederdag', 999),
-- etc. voor alle subtypes
```

### Optie 2: Frontend Aanpassing
De frontend kan een speciale "Eigen tekst" knop toevoegen die geen template ID gebruikt maar direct eigen tekst invoer toestaat.

### Optie 3: Generieke "Eigen tekst" Template
Voeg één generieke template toe die voor alle types werkt:

```sql
INSERT INTO dbo.regelingen_templates (template_naam, template_tekst, meervoud_kinderen, type, template_subtype, sort_order)
VALUES 
('eigen_tekst_algemeen', 'Eigen tekst invoeren', 0, 'Algemeen', 'algemeen', 999),
('eigen_tekst_algemeen_meervoud', 'Eigen tekst invoeren', 1, 'Algemeen', 'algemeen', 999);
```

## Aanbeveling

Ik raad **Optie 1** aan omdat:
1. Het de minste impact heeft op de frontend
2. Het consistent is met het huidige systeem
3. Het per categorie/subtype werkt

## Implementatie Stappen

1. Maak backup van huidige templates
2. Voeg "Eigen tekst invoeren" templates toe voor:
   - Feestdag (algemeen)
   - Vakantie (vakantie)
   - Bijzondere dag (alle 6 subtypes)
3. Test met frontend of eigen tekst weer werkt
4. Zorg dat sort_order hoog is (999) zodat "Eigen tekst" onderaan staat