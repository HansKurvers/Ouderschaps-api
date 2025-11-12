-- Restore script for regelingen_templates
-- Generated on: 2025-11-12T19:38:21.824Z

-- First, clear the table
DELETE FROM dbo.regelingen_templates;

-- Then insert backup data
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  4,
  'partij1',
  'Op {FEESTDAG} verblijft {KIND} bij {PARTIJ1}.',
  0,
  'Feestdag',
  15,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  5,
  'partij1',
  'Op {FEESTDAG} verblijven {KIND} bij {PARTIJ1}.',
  1,
  'Feestdag',
  15,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  6,
  'partij2',
  'Op {FEESTDAG} verblijft {KIND} bij {PARTIJ2}.',
  0,
  'Feestdag',
  20,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  8,
  'partij2',
  'Op {FEESTDAG} verblijven {KIND} bij {PARTIJ2}.',
  1,
  'Feestdag',
  20,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  9,
  'partij1_even',
  'Op {FEESTDAG} verblijft {KIND} in de even jaren bij {PARTIJ1} en in de oneven jaren bij {PARTIJ2}',
  0,
  'Feestdag',
  25,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  10,
  'partij1_even',
  'Op {FEESTDAG} verblijven {KIND} in de even jaren bij {PARTIJ1} en in de oneven jaren bij {PARTIJ2}',
  1,
  'Feestdag',
  25,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  11,
  'partij1_oneven',
  'Op {FEESTDAG} verblijft {KIND} in de oneven jaren bij {PARTIJ1} en in de even jaren bij {PARTIJ2}',
  0,
  'Feestdag',
  26,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  12,
  'partij1_oneven',
  'Op {FEESTDAG} verblijven {KIND} in de oneven jaren bij {PARTIJ1} en in de even jaren bij {PARTIJ2}',
  1,
  'Feestdag',
  26,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  13,
  'partij1_eerste_helft',
  'De eerste helft van {FEESTDAG} verblijft {KIND} bij {PARTIJ1} en de andere helft bij {PARTIJ2}',
  0,
  'Feestdag',
  30,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  15,
  'partij1_eerste_helft',
  'De eerste helft van {FEESTDAG} verblijven {KIND} bij {PARTIJ1} en de andere helft bij {PARTIJ2}',
  1,
  'Feestdag',
  30,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  16,
  'partij1',
  'In de {VAKANTIE} verblijft {KIND} bij {PARTIJ1}',
  0,
  'Vakantie',
  30,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  17,
  'partij1',
  'In de {VAKANTIE} verblijven {KIND} bij {PARTIJ1}',
  1,
  'Vakantie',
  30,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  18,
  'partij2',
  'In de {VAKANTIE} verblijft {KIND} bij {PARTIJ2}',
  0,
  'Vakantie',
  32,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  19,
  'partij2',
  'In de {VAKANTIE} verblijven {KIND} bij {PARTIJ2}',
  1,
  'Vakantie',
  32,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  20,
  'partij1_even',
  'In de {VAKANTIE} verblijft {KIND} in de even jaren bij {PARTIJ1} en in de oneven jaren bij {PARTIJ2}',
  0,
  'Vakantie',
  20,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  21,
  'partij1_even',
  'In de {VAKANTIE} verblijven {KIND} in de even jaren bij {PARTIJ1} en in de oneven jaren bij {PARTIJ2}',
  1,
  'Vakantie',
  20,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  22,
  'partij1_oneven',
  'In de {VAKANTIE} verblijft {KIND} in de oneven jaren bij {PARTIJ1} en in de even jaren bij {PARTIJ2}',
  0,
  'Vakantie',
  22,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  23,
  'partij1_oneven',
  'In de {VAKANTIE} verblijven {KIND} in de oneven jaren bij {PARTIJ1} en in de even jaren bij {PARTIJ2}',
  1,
  'Vakantie',
  22,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  24,
  'partij1_eerste_helft',
  'De eerste helft van de {VAKANTIE} verblijft {KIND} bij {PARTIJ1} en de tweede helft bij {PARTIJ2}',
  0,
  'Vakantie',
  10,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  25,
  'partij1_eerste_helft',
  'De eerste helft van de {VAKANTIE} verblijven {KIND} bij {PARTIJ1} en de tweede helft bij {PARTIJ2}',
  1,
  'Vakantie',
  10,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  26,
  'partij2_eerste_helft',
  'De eerste helft van de {VAKANTIE} verblijft {KIND} bij {PARTIJ2} en de tweede helft bij {PARTIJ1}',
  0,
  'Vakantie',
  12,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  27,
  'partij2_eerste_helft',
  'De eerste helft van de {VAKANTIE} verblijven {KIND} bij {PARTIJ2} en de tweede helft bij {PARTIJ1}',
  1,
  'Vakantie',
  12,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  36,
  'partij1',
  'De ouders beslissen over de {BESLISSING} van {KIND} na overleg en overeenstemming.',
  0,
  'Algemeen',
  30,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  37,
  'partij2',
  'De ouders beslissen over de {BESLISSING} van {KIND} overleg is niet nodig.',
  0,
  'Algemeen',
  31,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  38,
  'partij1_zonder_overleg',
  '{PARTIJ1} beslist over de {BESLISSING} van {KIND} zonder dat overleg vooraf nodig is',
  0,
  'Algemeen',
  20,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  39,
  'partij2_zonder_overleg',
  '{PARTIJ2} beslist over de {BESLISSING} van {KIND} zonder dat overleg vooraf nodig is',
  0,
  'Algemeen',
  21,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  40,
  'partij1_vooraf_overleg',
  '{BESLISSING} van {KIND} wordt verzorgt door {PARTIJ1} in overeenstemming met {PARTIJ2}',
  0,
  'Algemeen',
  10,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  41,
  'partij2_vooraf_overleg',
  '{BESLISSING} van {KIND} wordt verzorgt door {PARTIJ2} in overeenstemming met {PARTIJ1}',
  0,
  'Algemeen',
  11,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  42,
  'partij1_achteraf_informeren',
  '{BESLISSING} van {KIND} wordt verzorgt door {PARTIJ2} zonder overleg met {PARTIJ1}, wel achteraf informeren',
  0,
  'Algemeen',
  15,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  43,
  'partij2_achteraf_informeren',
  '{BESLISSING} van {KIND} wordt verzorgt door {PARTIJ1} zonder overleg met {PARTIJ2}, wel achteraf informeren',
  0,
  'Algemeen',
  16,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  44,
  'partij2_eerste_helft',
  'De eerste helft van {FEESTDAG} verblijft {KIND} bij {PARTIJ2} en de andere helft bij {PARTIJ1}',
  0,
  'Feestdag',
  31,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  47,
  'partij2_eerste_helft',
  'De eerste helft van {FEESTDAG} verblijven {KIND} bij {PARTIJ2} en de andere helft bij {PARTIJ1}',
  1,
  'Feestdag',
  31,
  NULL,
  NULL
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  48,
  'vaderdag_bij_vader',
  '{KIND} is op {FEESTDAG} bij {PARTIJ1}.',
  0,
  'Feestdag',
  41,
  '{KIND} is op {FEESTDAG} bij {PARTIJ1}',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  49,
  'vaderdag_met_avond',
  '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}.',
  0,
  'Feestdag',
  51,
  '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  50,
  'vaderdag_weekend',
  '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ1}.',
  0,
  'Feestdag',
  61,
  '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ1}',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  51,
  'vaderdag_deel_dag',
  '{KIND} krijgt de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ1} te zijn.',
  0,
  'Feestdag',
  71,
  '{KIND} krijgt gelegenheid om deel van {FEESTDAG} bij {PARTIJ1} te zijn',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  52,
  'vaderdag_volgens_schema',
  'Op {FEESTDAG} loopt de zorgregeling volgens schema.',
  0,
  'Feestdag',
  81,
  'Op {FEESTDAG} loopt de zorgregeling volgens schema',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  53,
  'vaderdag_eigen_tekst',
  'Eigen tekst invoeren',
  0,
  'Feestdag',
  91,
  'Eigen tekst invoeren',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  54,
  'vaderdag_bij_vader_meervoud',
  'De kinderen zijn op {FEESTDAG} bij {PARTIJ1}.',
  1,
  'Feestdag',
  101,
  'De kinderen zijn op {FEESTDAG} bij {PARTIJ1}',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  55,
  'vaderdag_met_avond_meervoud',
  'De kinderen zijn op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}.',
  1,
  'Feestdag',
  111,
  'De kinderen zijn op {FEESTDAG} en de avond voorafgaand bij {PARTIJ1}',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  56,
  'vaderdag_weekend_meervoud',
  'De kinderen zijn in het weekend van {FEESTDAG} bij {PARTIJ1}.',
  1,
  'Feestdag',
  121,
  'De kinderen zijn in het weekend van {FEESTDAG} bij {PARTIJ1}',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  57,
  'vaderdag_deel_dag_meervoud',
  'De kinderen krijgen de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ1} te zijn.',
  1,
  'Feestdag',
  131,
  'De kinderen krijgen gelegenheid om deel van {FEESTDAG} bij {PARTIJ1} te zijn',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  58,
  'vaderdag_volgens_schema_meervoud',
  'Op {FEESTDAG} loopt de zorgregeling volgens schema.',
  1,
  'Feestdag',
  141,
  'Op {FEESTDAG} loopt de zorgregeling volgens schema',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  59,
  'vaderdag_eigen_tekst_meervoud',
  'Eigen tekst invoeren',
  1,
  'Feestdag',
  151,
  'Eigen tekst invoeren',
  'vaderdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  60,
  'moederdag_bij_moeder',
  '{KIND} is op {FEESTDAG} bij {PARTIJ2}.',
  0,
  'Feestdag',
  161,
  '{KIND} is op {FEESTDAG} bij {PARTIJ2}',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  61,
  'moederdag_met_avond',
  '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}.',
  0,
  'Feestdag',
  171,
  '{KIND} is op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  62,
  'moederdag_weekend',
  '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ2}.',
  0,
  'Feestdag',
  181,
  '{KIND} is in het weekend van {FEESTDAG} bij {PARTIJ2}',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  63,
  'moederdag_deel_dag',
  '{KIND} krijgt de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ2} te zijn.',
  0,
  'Feestdag',
  191,
  '{KIND} krijgt gelegenheid om deel van {FEESTDAG} bij {PARTIJ2} te zijn',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  64,
  'moederdag_volgens_schema',
  'Op {FEESTDAG} loopt de zorgregeling volgens schema.',
  0,
  'Feestdag',
  201,
  'Op {FEESTDAG} loopt de zorgregeling volgens schema',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  65,
  'moederdag_eigen_tekst',
  'Eigen tekst invoeren',
  0,
  'Feestdag',
  211,
  'Eigen tekst invoeren',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  66,
  'moederdag_bij_moeder_meervoud',
  'De kinderen zijn op {FEESTDAG} bij {PARTIJ2}.',
  1,
  'Feestdag',
  161,
  'De kinderen zijn op {FEESTDAG} bij {PARTIJ2}',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  67,
  'moederdag_met_avond_meervoud',
  'De kinderen zijn op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}.',
  1,
  'Feestdag',
  171,
  'De kinderen zijn op {FEESTDAG} en de avond voorafgaand bij {PARTIJ2}',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  68,
  'moederdag_weekend_meervoud',
  'De kinderen zijn in het weekend van {FEESTDAG} bij {PARTIJ2}.',
  1,
  'Feestdag',
  181,
  'De kinderen zijn in het weekend van {FEESTDAG} bij {PARTIJ2}',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  69,
  'moederdag_deel_dag_meervoud',
  'De kinderen krijgen de gelegenheid om op {FEESTDAG} een deel van de dag bij {PARTIJ2} te zijn.',
  1,
  'Feestdag',
  191,
  'De kinderen krijgen gelegenheid om deel van {FEESTDAG} bij {PARTIJ2} te zijn',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  70,
  'moederdag_volgens_schema_meervoud',
  'Op {FEESTDAG} loopt de zorgregeling volgens schema.',
  1,
  'Feestdag',
  201,
  'Op {FEESTDAG} loopt de zorgregeling volgens schema',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  71,
  'moederdag_eigen_tekst_meervoud',
  'Eigen tekst invoeren',
  1,
  'Feestdag',
  211,
  'Eigen tekst invoeren',
  'moederdag'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  120,
  'verj_kind_bij_jarige',
  '{KIND} viert zijn/haar verjaardag bij degene waar {KIND} op die dag volgens schema is.',
  0,
  'Feestdag',
  461,
  '{KIND} viert verjaardag waar hij/zij volgens schema is',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  121,
  'verj_kind_beide_vieren',
  '{KIND} viert zijn/haar verjaardag met beide ouders samen.',
  0,
  'Feestdag',
  471,
  '{KIND} viert verjaardag met beide ouders',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  122,
  'verj_kind_wisselend',
  '{KIND} viert zijn/haar verjaardag het ene jaar bij {PARTIJ1} en het andere jaar bij {PARTIJ2}.',
  0,
  'Feestdag',
  481,
  '{KIND} viert verjaardag wisselend per jaar',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  123,
  'verj_kind_dubbel_feest',
  '{KIND} heeft twee verjaardagsfeestjes: één bij {PARTIJ1} en één bij {PARTIJ2}.',
  0,
  'Feestdag',
  491,
  '{KIND} heeft twee verjaardagsfeestjes',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  124,
  'verj_kind_overleg',
  'De verjaardag van {KIND} wordt in onderling overleg gevierd.',
  0,
  'Feestdag',
  501,
  'Verjaardag {KIND} in onderling overleg',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  125,
  'verj_kind_eigen_tekst',
  'Eigen tekst invoeren',
  0,
  'Feestdag',
  511,
  'Eigen tekst invoeren',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  127,
  'verj_kind_beide_vieren_meervoud',
  'De kinderen vieren hun verjaardag met beide ouders samen.',
  1,
  'Feestdag',
  531,
  'De kinderen vieren verjaardag met beide ouders',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  128,
  'verj_kind_wisselend_meervoud',
  'De kinderen vieren hun verjaardag het ene jaar bij {PARTIJ1} en het andere jaar bij {PARTIJ2}.',
  1,
  'Feestdag',
  541,
  'De kinderen vieren verjaardag wisselend per jaar',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  129,
  'verj_kind_dubbel_feest_meervoud',
  'De kinderen hebben twee verjaardagsfeestjes: één bij {PARTIJ1} en één bij {PARTIJ2}.',
  1,
  'Feestdag',
  551,
  'De kinderen hebben twee verjaardagsfeestjes',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  131,
  'verj_kind_eigen_tekst_meervoud',
  'Eigen tekst invoeren',
  1,
  'Feestdag',
  571,
  'Eigen tekst invoeren',
  'verjaardag_kind'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  132,
  'verj_ouder_bezoek',
  '{KIND} mag op de verjaardag van beide ouders op bezoek komen.',
  0,
  'Feestdag',
  581,
  '{KIND} mag beide ouders bezoeken op hun verjaardag',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  133,
  'verj_ouder_hele_dag',
  '{KIND} is op de verjaardag van {PARTIJ1}/{PARTIJ2} de hele dag bij de jarige ouder.',
  0,
  'Feestdag',
  591,
  '{KIND} is hele dag bij jarige ouder',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  134,
  'verj_ouder_deel_dag',
  '{KIND} is een deel van de dag bij de jarige ouder op diens verjaardag.',
  0,
  'Feestdag',
  601,
  '{KIND} is deel van dag bij jarige ouder',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  135,
  'verj_ouder_volgens_schema',
  'Op de verjaardag van de ouders loopt de zorgregeling volgens schema.',
  0,
  'Feestdag',
  611,
  'Op verjaardag ouders loopt zorgregeling door',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  136,
  'verj_ouder_overleg',
  'Voor de verjaardag van de ouders maken partijen in onderling overleg afspraken.',
  0,
  'Feestdag',
  621,
  'Verjaardag ouders in onderling overleg',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  137,
  'verj_ouder_eigen_tekst',
  'Eigen tekst invoeren',
  0,
  'Feestdag',
  631,
  'Eigen tekst invoeren',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  138,
  'verj_ouder_bezoek_meervoud',
  '{KIND} mogen op de verjaardag van beide ouders op bezoek komen.',
  1,
  'Feestdag',
  641,
  '{KIND} mogen beide ouders bezoeken op hun verjaardag',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  139,
  'verj_ouder_hele_dag_meervoud',
  '{KIND} zijn op de verjaardag van {PARTIJ1}/{PARTIJ2} de hele dag bij de jarige ouder.',
  1,
  'Feestdag',
  651,
  '{KIND} zijn hele dag bij jarige ouder',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  140,
  'verj_ouder_deel_dag_meervoud',
  '{KIND} zijn een deel van de dag bij de jarige ouder op diens verjaardag.',
  1,
  'Feestdag',
  661,
  '{KIND} zijn deel van dag bij jarige ouder',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  141,
  'verj_ouder_volgens_schema_meervoud',
  'Op de verjaardag van de ouders loopt de zorgregeling volgens schema.',
  1,
  'Feestdag',
  671,
  'Op verjaardag ouders loopt zorgregeling door',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  142,
  'verj_ouder_overleg_meervoud',
  'Voor de verjaardag van de ouders maken partijen in onderling overleg afspraken.',
  1,
  'Feestdag',
  681,
  'Verjaardag ouders in onderling overleg',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  143,
  'verj_ouder_eigen_tekst_meervoud',
  'Eigen tekst invoeren',
  1,
  'Feestdag',
  691,
  'Eigen tekst invoeren',
  'verjaardag_partij1'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  144,
  'verj_groot_beide_bezoeken',
  '{KIND} bezoekt de grootouders van beide kanten op hun verjaardag.',
  0,
  'Feestdag',
  701,
  '{KIND} bezoekt alle grootouders op verjaardag',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  145,
  'verj_groot_bij_ouder',
  '{KIND} bezoekt grootouders samen met de ouder aan wiens kant zij familie zijn.',
  0,
  'Feestdag',
  711,
  '{KIND} bezoekt grootouders met betreffende ouder',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  146,
  'verj_groot_volgens_schema',
  'Voor verjaardagen van grootouders loopt de zorgregeling volgens schema.',
  0,
  'Feestdag',
  721,
  'Bij verjaardag grootouders loopt zorgregeling door',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  147,
  'verj_groot_overleg',
  'Bezoek aan grootouders op verjaardagen wordt in onderling overleg geregeld.',
  0,
  'Feestdag',
  731,
  'Verjaardag grootouders in onderling overleg',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  148,
  'verj_groot_eigen_keuze',
  '{KIND} mag zelf kiezen of hij/zij de grootouders bezoekt op hun verjaardag.',
  0,
  'Feestdag',
  741,
  '{KIND} kiest zelf over bezoek grootouders',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  149,
  'verj_groot_eigen_tekst',
  'Eigen tekst invoeren',
  0,
  'Feestdag',
  751,
  'Eigen tekst invoeren',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  150,
  'verj_groot_beide_bezoeken_meervoud',
  '{KIND} bezoeken de grootouders van beide kanten op hun verjaardag.',
  1,
  'Feestdag',
  761,
  '{KIND} bezoeken alle grootouders op verjaardag',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  151,
  'verj_groot_bij_ouder_meervoud',
  '{KIND} bezoeken grootouders samen met de ouder aan wiens kant zij familie zijn.',
  1,
  'Feestdag',
  771,
  '{KIND} bezoeken grootouders met betreffende ouder',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  152,
  'verj_groot_volgens_schema_meervoud',
  'Voor verjaardagen van grootouders loopt de zorgregeling volgens schema.',
  1,
  'Feestdag',
  781,
  'Bij verjaardag grootouders loopt zorgregeling door',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  153,
  'verj_groot_overleg_meervoud',
  'Bezoek aan grootouders op verjaardagen wordt in onderling overleg geregeld.',
  1,
  'Feestdag',
  791,
  'Verjaardag grootouders in onderling overleg',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  154,
  'verj_groot_eigen_keuze_meervoud',
  '{KIND} mogen zelf kiezen of zij de grootouders bezoeken op hun verjaardag.',
  1,
  'Feestdag',
  801,
  'De kinderen kiezen zelf over bezoek grootouders',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  155,
  'verj_groot_eigen_tekst_meervoud',
  'Eigen tekst invoeren',
  1,
  'Feestdag',
  811,
  'Eigen tekst invoeren',
  'verjaardag_partij2'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  156,
  'jubilea_aanwezig',
  '{KIND} is aanwezig bij bijzondere jubilea van familieleden.',
  0,
  'Feestdag',
  821,
  '{KIND} is aanwezig bij familiejubilea',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  157,
  'jubilea_familie_kant',
  '{KIND} is bij jubilea aanwezig bij de familie van de betreffende kant.',
  0,
  'Feestdag',
  831,
  '{KIND} bij jubilea van betreffende familiekant',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  158,
  'jubilea_overleg',
  'Voor bijzondere jubilea overleggen partijen per gelegenheid.',
  0,
  'Feestdag',
  841,
  'Bijzondere jubilea in onderling overleg',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  159,
  'jubilea_schema_uitzondering',
  'Bij bijzondere jubilea kan van het reguliere schema worden afgeweken in overleg.',
  0,
  'Feestdag',
  851,
  'Bij jubilea afwijken van schema mogelijk',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  160,
  'jubilea_informeren',
  'Partijen informeren elkaar tijdig over bijzondere jubilea in de familie.',
  0,
  'Feestdag',
  861,
  'Partijen informeren elkaar over jubilea',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  161,
  'jubilea_eigen_tekst',
  'Eigen tekst invoeren',
  0,
  'Feestdag',
  871,
  'Eigen tekst invoeren',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  162,
  'jubilea_aanwezig_meervoud',
  '{KIND} zijn aanwezig bij bijzondere jubilea van familieleden.',
  1,
  'Feestdag',
  881,
  '{KIND} zijn aanwezig bij familiejubilea',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  163,
  'jubilea_familie_kant_meervoud',
  '{KIND} zijn bij jubilea aanwezig bij de familie van de betreffende kant.',
  1,
  'Feestdag',
  891,
  '{KIND} bij jubilea van betreffende familiekant',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  164,
  'jubilea_overleg_meervoud',
  'Voor bijzondere jubilea overleggen partijen per gelegenheid.',
  1,
  'Feestdag',
  901,
  'Bijzondere jubilea in onderling overleg',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  165,
  'jubilea_schema_uitzondering_meervoud',
  'Bij bijzondere jubilea kan van het reguliere schema worden afgeweken in overleg.',
  1,
  'Feestdag',
  911,
  'Bij jubilea afwijken van schema mogelijk',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  166,
  'jubilea_informeren_meervoud',
  'Partijen informeren elkaar tijdig over bijzondere jubilea in de familie.',
  1,
  'Feestdag',
  921,
  'Partijen informeren elkaar over jubilea',
  'bijzonder_jubileum'
);
INSERT INTO dbo.regelingen_templates (id, template_naam, template_tekst, meervoud_kinderen, type, sort_order, card_tekst, template_subtype) VALUES (
  167,
  'jubilea_eigen_tekst_meervoud',
  'Eigen tekst invoeren',
  1,
  'Feestdag',
  931,
  'Eigen tekst invoeren',
  'bijzonder_jubileum'
);
