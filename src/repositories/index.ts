/**
 * Repository Pattern Implementation
 *
 * This module exports all domain-specific repositories.
 * Each repository handles database operations for a specific entity.
 *
 * Migration Status:
 * - ✅ DossierRepository (COMPLETE - 14 tests passing)
 * - ✅ PersoonRepository (COMPLETE - 23 tests passing)
 * - ✅ PartijRepository (COMPLETE - 19 tests passing)
 * - ✅ KindRepository (COMPLETE - 32 tests passing)
 * - ✅ AlimentatieRepository (COMPLETE - 27 tests passing)
 * - 🔄 OmgangRepository (TODO)
 * - 🔄 ZorgRepository (TODO)
 * - 🔄 OuderschapsplanRepository (TODO)
 * - 🔄 LookupRepository (TODO)
 *
 * See: REPOSITORY_MIGRATION_GUIDE.md for migration strategy
 */

export { BaseRepository } from './base/BaseRepository';
export { DossierRepository } from './DossierRepository';
export { PersoonRepository } from './PersoonRepository';
export { PartijRepository } from './PartijRepository';
export type { PartijResult } from './PartijRepository';
export { KindRepository } from './KindRepository';
export type { KindWithOuders, OuderRelatie } from './KindRepository';
export { AlimentatieRepository } from './AlimentatieRepository';
export type { IAlimentatieRepository, CreateAlimentatieDto, UpdateAlimentatieDto } from './interfaces/IAlimentatieRepository';

// Export other repositories as they are implemented
// export { OmgangRepository } from './OmgangRepository';
// export { ZorgRepository } from './ZorgRepository';
// export { OuderschapsplanRepository } from './OuderschapsplanRepository';
// export { LookupRepository } from './LookupRepository';
