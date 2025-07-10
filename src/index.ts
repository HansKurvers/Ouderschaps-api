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

// Persoon functions
import './functions/personen/createPersoon';
import './functions/personen/getPersoonById';
import './functions/personen/updatePersoon';
import './functions/personen/deletePersoon';

// Lookup functions
import './functions/lookups/getRollen';

// This file serves as the main entry point for Azure Functions
// All functions are registered through their respective imports

export default app;
