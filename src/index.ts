import { app } from '@azure/functions';

// Import all function handlers to register them
import './functions/health';

// Dossier functions
import './functions/dossiers/getDossiers';
import './functions/dossiers/createDossier';
import './functions/dossiers/getDossierById';
import './functions/dossiers/updateDossier';
import './functions/dossiers/deleteDossier';
import './functions/dossiers/addPartijToDossier';
import './functions/dossiers/removePartijFromDossier';
import './functions/dossiers/getDossierPartijen';
import './functions/dossiers/getDossierKinderen';
import './functions/dossiers/addKindToDossier';
import './functions/dossiers/removeKindFromDossier';

// Persoon functions
import './functions/personen/createPersoon';
import './functions/personen/getPersoonById';
import './functions/personen/updatePersoon';
import './functions/personen/deletePersoon';

// Kinderen functions (FASE 3)
import './functions/kinderen/getKindOuders';
import './functions/kinderen/addOuderToKind';
import './functions/kinderen/updateKindOuderRelatie';
import './functions/kinderen/removeOuderFromKind';

// Lookup functions
import './functions/lookups/getRollen';
import './functions/lookups/getRelatieTypes';
import './functions/lookups/getDagen';
import './functions/lookups/getDagdelen';
import './functions/lookups/getWeekRegelingen';
import './functions/lookups/getZorgCategorieen';
import './functions/lookups/getZorgSituaties';

// Omgang functions (FASE 4)
import './functions/dossiers/getDossierOmgang';
import './functions/dossiers/createOmgang';
import './functions/dossiers/updateOmgang';
import './functions/dossiers/deleteOmgang';

// Zorg functions (FASE 4)
import './functions/dossiers/getDossierZorg';
import './functions/dossiers/createZorg';
import './functions/dossiers/updateZorg';
import './functions/dossiers/deleteZorg';

// This file serves as the main entry point for Azure Functions
// All functions are registered through their respective imports

export default app;
