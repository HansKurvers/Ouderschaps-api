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
 * - ✅ OmgangRepository (COMPLETE - 33 tests passing)
 * - ✅ ZorgRepository (COMPLETE - 28 tests passing)
 * - ✅ LookupRepository (COMPLETE - 33 tests passing)
 * - 🔄 OuderschapsplanRepository (TODO)
 *
 * Total: 209 tests passing across 8 repositories
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
export { OmgangRepository } from './OmgangRepository';
export type { IOmgangRepository } from './interfaces/IOmgangRepository';
export { ZorgRepository } from './ZorgRepository';
export type { IZorgRepository, CreateZorgDto, UpdateZorgDto } from './interfaces/IZorgRepository';
export { LookupRepository } from './LookupRepository';
export type { ILookupRepository } from './interfaces/ILookupRepository';

// Export other repositories as they are implemented
// export { OuderschapsplanRepository } from './OuderschapsplanRepository';
