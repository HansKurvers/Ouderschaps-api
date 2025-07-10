import { app } from '@azure/functions';

// Import all function handlers to register them
import './functions/health';
import './functions/getDossiers';
import './functions/createDossier';
import './functions/getDossierById';
import './functions/updateDossier';
import './functions/deleteDossier';

// This file serves as the main entry point for Azure Functions
// All functions are registered through their respective imports

export default app;
