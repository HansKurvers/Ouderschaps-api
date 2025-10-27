import { app } from '@azure/functions';

// Import all function handlers to register them
import './functions/health';
import './functions/health/auth-check';
import './functions/health/env-check';
import './functions/health/auth-debug';

// Dossier functions
import './functions/dossiers/getDossiers';
import './functions/dossiers/createDossier';
import './functions/dossiers/getDossierById';
import './functions/dossiers/updateDossier';
import './functions/dossiers/deleteDossier';
import './functions/dossiers/updateDossierAnonymity';
import './functions/dossiers/addPartijToDossier';
import './functions/dossiers/removePartijFromDossier';
import './functions/dossiers/updatePartijRol';
import './functions/dossiers/getDossierPartijen';
import './functions/dossiers/getDossierKinderen';
import './functions/dossiers/addKindToDossier';
import './functions/dossiers/removeKindFromDossier';

// Persoon functions
import './functions/personen/createPersoon';
import './functions/personen/getPersonen';
import './functions/personen/getPersoonById';
import './functions/personen/updatePersoon';
import './functions/personen/deletePersoon';
import './functions/personen/checkPersoonDependencies';

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
import './functions/lookups/getSchoolvakanties';
import './functions/lookups/getRegelingenTemplates';



// Omgang functions (FASE 4) - Migrated to repository pattern
import './functions/omgang/createOmgang';
import './functions/omgang/getDossierOmgang';
import './functions/omgang/getDossierSchedule';
import './functions/omgang/updateOmgang';
import './functions/omgang/deleteOmgang';
// Legacy batch/week functions (to be deprecated)
import './functions/dossiers/createOmgangBatch';
import './functions/dossiers/upsertOmgangWeek';
import './functions/dossiers/getOmgangWeek';

// Zorg functions (FASE 4) - Migrated to repository pattern
import './functions/zorg/getDossierZorg';
import './functions/zorg/createZorg';
import './functions/zorg/updateZorg';
import './functions/zorg/deleteZorg';

// Alimentatie functions (FASE 5)
import './functions/alimentatie/getAlimentatieByDossierId';
import './functions/alimentatie/createAlimentatie';
import './functions/alimentatie/updateAlimentatie';
import './functions/alimentatie/upsertAlimentatie';
import './functions/alimentatie/getAlimentatieTemplates';
import './functions/alimentatie/getBijdrageKosten';
import './functions/alimentatie/createBijdrageKosten';
import './functions/alimentatie/upsertBijdrageKosten';
import './functions/alimentatie/replaceBijdrageKosten';
import './functions/alimentatie/getFinancieleAfspraken';
import './functions/alimentatie/createFinancieleAfspraak';
import './functions/alimentatie/replaceFinancieleAfspraken';

// Ouderschapsplan functions
import './functions/ouderschapsplan/getAllOuderschapsplanInfo';
import './functions/ouderschapsplan/getOuderschapsplanInfoById';
import './functions/ouderschapsplan/getOuderschapsplanInfoByDossierId';
import './functions/ouderschapsplan/getOuderschapsplanInfoByPersoonId';
import './functions/ouderschapsplan/createOuderschapsplanInfo';
import './functions/ouderschapsplan/updateOuderschapsplanInfo';
import './functions/ouderschapsplan/deleteOuderschapsplanInfo';
import './functions/ouderschapsplan/upsertOuderschapsplanInfo';

// Ouderschapsplan repository functions (FASE 6 - THE FINALE!)
import './functions/ouderschapsplan/getCompletePlan';
import './functions/ouderschapsplan/getPlanSummary';
import './functions/ouderschapsplan/validatePlan';
import './functions/ouderschapsplan/getPlanMetadata';

// Debug functions
import './functions/debug/inspectDossier';
import './functions/debug/debugOmgang';

// This file serves as the main entry point for Azure Functions
// All functions are registered through their respective imports

export default app;
