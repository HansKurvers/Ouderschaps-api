/**
 * Repository Pattern Implementation
 *
 * This module exports all domain-specific repositories.
 * Each repository handles database operations for a specific entity.
 *
 * Migration Status:
 * - ✅ DossierRepository (COMPLETE - 14 tests passing)
 * - ✅ PersoonRepository (COMPLETE - 23 tests passing)
 * - 🔄 PartijRepository (TODO)
 * - 🔄 KindRepository (TODO)
 * - 🔄 OmgangRepository (TODO)
 * - 🔄 ZorgRepository (TODO)
 * - 🔄 AlimentatieRepository (TODO)
 * - 🔄 OuderschapsplanRepository (TODO)
 * - 🔄 LookupRepository (TODO)
 *
 * See: REPOSITORY_MIGRATION_GUIDE.md for migration strategy
 */

export { BaseRepository } from './base/BaseRepository';
export { DossierRepository } from './DossierRepository';
export { PersoonRepository } from './PersoonRepository';

// Export other repositories as they are implemented
// export { PartijRepository } from './PartijRepository';
// export { KindRepository } from './KindRepository';
// export { OmgangRepository } from './OmgangRepository';
// export { ZorgRepository } from './ZorgRepository';
// export { AlimentatieRepository } from './AlimentatieRepository';
// export { OuderschapsplanRepository } from './OuderschapsplanRepository';
// export { LookupRepository } from './LookupRepository';
