import { BaseRepository } from './base/BaseRepository';
import { Persoon } from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

/**
 * Repository for Persoon (Person) entity operations
 *
 * Responsibilities:
 * - Person CRUD operations
 * - Email uniqueness validation
 * - Search by name/email
 * - Pagination support
 *
 * @example
 * ```typescript
 * const repo = new PersoonRepository();
 * const person = await repo.findById(personId);
 * const allPersons = await repo.findAll({ limit: 50, offset: 0 });
 * ```
 *
 * @extends BaseRepository
 */
export class PersoonRepository extends BaseRepository {
    /**
     * Finds a person by their ID
     *
     * @param id - Person identifier
     * @returns Person object or null if not found
     *
     * @example
     * ```typescript
     * const person = await repo.findById(123);
     * if (person) {
     *   console.log(person.achternaam);
     * }
     * ```
     */
    async findById(id: number): Promise<Persoon | null> {
        const query = `
            SELECT * FROM dbo.personen
            WHERE id = @id
        `;

        const record = await this.querySingle(query, { id });
        return record ? DbMappers.toPersoon(record) : null;
    }

    /**
     * Finds all persons with optional pagination
     *
     * @param filters - Optional pagination filters
     * @param filters.limit - Maximum number of records to return (default: 50, max: 100)
     * @param filters.offset - Number of records to skip (default: 0)
     * @returns Array of persons ordered by ID
     *
     * @example
     * ```typescript
     * // Get first 50 persons
     * const persons = await repo.findAll();
     *
     * // Get next 50 persons
     * const nextPage = await repo.findAll({ limit: 50, offset: 50 });
     * ```
     */
    async findAll(filters?: { limit?: number; offset?: number }): Promise<Persoon[]> {
        const limit = Math.min(filters?.limit || 50, 100);
        const offset = filters?.offset || 0;

        const query = `
            SELECT *
            FROM dbo.personen
            ORDER BY id
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const records = await this.queryMany(query, { limit, offset });
        return records.map(DbMappers.toPersoon);
    }

    /**
     * Finds a person by email address
     *
     * @param email - Email address to search for
     * @returns Person object or null if not found
     *
     * @example
     * ```typescript
     * const person = await repo.findByEmail('john@example.com');
     * ```
     */
    async findByEmail(email: string): Promise<Persoon | null> {
        const query = `
            SELECT * FROM dbo.personen
            WHERE email = @email
        `;

        const record = await this.querySingle(query, { email });
        return record ? DbMappers.toPersoon(record) : null;
    }

    /**
     * Finds persons by last name using partial match
     *
     * @param achternaam - Last name to search for (supports partial match)
     * @returns Array of matching persons ordered by last name, first names
     *
     * @example
     * ```typescript
     * // Find all persons with last name containing 'Jan'
     * const persons = await repo.findByAchternaam('Jan');
     * // Returns: Jansen, Janssen, De Jansens, etc.
     * ```
     */
    async findByAchternaam(achternaam: string): Promise<Persoon[]> {
        const query = `
            SELECT * FROM dbo.personen
            WHERE achternaam LIKE @achternaam
            ORDER BY achternaam, voornamen
        `;

        const searchPattern = `%${achternaam}%`;
        const records = await this.queryMany(query, { achternaam: searchPattern });
        return records.map(DbMappers.toPersoon);
    }

    /**
     * Checks if an email address is unique in the database
     *
     * @param email - Email address to check
     * @param excludeId - Optional person ID to exclude from check (for updates)
     * @returns True if email is unique (not used), false if already exists
     *
     * @example
     * ```typescript
     * // Check if email is available
     * const isUnique = await repo.checkEmailUnique('new@example.com');
     *
     * // Check if email is unique excluding current person (for updates)
     * const canUpdate = await repo.checkEmailUnique('john@example.com', 123);
     * ```
     */
    async checkEmailUnique(email: string, excludeId?: number): Promise<boolean> {
        let query = `
            SELECT COUNT(*) as count
            FROM dbo.personen
            WHERE email = @email
        `;

        const params: Record<string, any> = { email };

        if (excludeId !== undefined) {
            query += ' AND id != @excludeId';
            params.excludeId = excludeId;
        }

        const result = await this.querySingle<{ count: number }>(query, params);
        // Return true if count is 0 (email is unique)
        // Return false if count > 0 (email already exists)
        return result ? result.count === 0 : true;
    }

    /**
     * Creates a new person in the database
     *
     * @param data - Person data (must include achternaam at minimum)
     * @returns Newly created person with generated ID
     * @throws Error if achternaam is missing or database insert fails
     *
     * @example
     * ```typescript
     * const newPerson = await repo.create({
     *   voorletters: 'J.',
     *   voornamen: 'John',
     *   achternaam: 'Doe',
     *   email: 'john@example.com',
     *   telefoon: '0612345678'
     * });
     * console.log(newPerson.id); // Generated ID
     * ```
     */
    async create(data: Partial<Persoon>): Promise<Persoon> {
        if (!data.achternaam) {
            throw new Error('Achternaam is required to create a person');
        }

        const dto = DbMappers.toPersoonDto(data as Persoon);

        const query = `
            INSERT INTO dbo.personen (
                voorletters, voornamen, roepnaam, geslacht, tussenvoegsel, achternaam,
                adres, postcode, plaats, geboorteplaats, geboorte_datum, geboorteland,
                nationaliteit_1, nationaliteit_2, telefoon, email, beroep
            )
            OUTPUT INSERTED.*
            VALUES (
                @voorletters, @voornamen, @roepnaam, @geslacht, @tussenvoegsel, @achternaam,
                @adres, @postcode, @plaats, @geboorteplaats, @geboorteDatum, @geboorteland,
                @nationaliteit1, @nationaliteit2, @telefoon, @email, @beroep
            )
        `;

        const params = {
            voorletters: dto.voorletters,
            voornamen: dto.voornamen,
            roepnaam: dto.roepnaam,
            geslacht: dto.geslacht,
            tussenvoegsel: dto.tussenvoegsel,
            achternaam: dto.achternaam,
            adres: dto.adres,
            postcode: dto.postcode,
            plaats: dto.plaats,
            geboorteplaats: dto.geboorteplaats,
            geboorteDatum: dto.geboorte_datum,
            geboorteland: dto.geboorteland,
            nationaliteit1: dto.nationaliteit_1,
            nationaliteit2: dto.nationaliteit_2,
            telefoon: dto.telefoon,
            email: dto.email,
            beroep: dto.beroep,
        };

        const record = await this.querySingle(query, params);

        if (!record) {
            throw new Error('Failed to create person');
        }

        return DbMappers.toPersoon(record);
    }

    /**
     * Updates an existing person's data
     *
     * @param id - Person ID to update
     * @param data - Partial person data to update
     * @returns Updated person object
     * @throws Error if person not found
     *
     * @example
     * ```typescript
     * const updated = await repo.update(123, {
     *   email: 'newemail@example.com',
     *   telefoon: '0687654321'
     * });
     * ```
     */
    async update(id: number, data: Partial<Persoon>): Promise<Persoon> {
        // Check if person exists first
        const existing = await this.findById(id);
        if (!existing) {
            throw new Error(`Person with ID ${id} not found`);
        }

        const dto = DbMappers.toPersoonDto({ ...existing, ...data } as Persoon);

        const query = `
            UPDATE dbo.personen
            SET
                voorletters = @voorletters,
                voornamen = @voornamen,
                roepnaam = @roepnaam,
                geslacht = @geslacht,
                tussenvoegsel = @tussenvoegsel,
                achternaam = @achternaam,
                adres = @adres,
                postcode = @postcode,
                plaats = @plaats,
                geboorteplaats = @geboorteplaats,
                geboorte_datum = @geboorteDatum,
                geboorteland = @geboorteland,
                nationaliteit_1 = @nationaliteit1,
                nationaliteit_2 = @nationaliteit2,
                telefoon = @telefoon,
                email = @email,
                beroep = @beroep
            OUTPUT INSERTED.*
            WHERE id = @id
        `;

        const params = {
            id,
            voorletters: dto.voorletters,
            voornamen: dto.voornamen,
            roepnaam: dto.roepnaam,
            geslacht: dto.geslacht,
            tussenvoegsel: dto.tussenvoegsel,
            achternaam: dto.achternaam,
            adres: dto.adres,
            postcode: dto.postcode,
            plaats: dto.plaats,
            geboorteplaats: dto.geboorteplaats,
            geboorteDatum: dto.geboorte_datum,
            geboorteland: dto.geboorteland,
            nationaliteit1: dto.nationaliteit_1,
            nationaliteit2: dto.nationaliteit_2,
            telefoon: dto.telefoon,
            email: dto.email,
            beroep: dto.beroep,
        };

        const record = await this.querySingle(query, params);

        if (!record) {
            throw new Error(`Failed to update person with ID ${id}`);
        }

        return DbMappers.toPersoon(record);
    }

    /**
     * Deletes a person from the database
     *
     * @param id - Person ID to delete
     * @returns True if deletion successful, false if person not found
     *
     * @example
     * ```typescript
     * const deleted = await repo.delete(123);
     * if (deleted) {
     *   console.log('Person deleted successfully');
     * } else {
     *   console.log('Person not found');
     * }
     * ```
     */
    async delete(id: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.personen
            WHERE id = @id
        `;

        const result = await this.executeQuery(query, { id });
        return result.rowsAffected[0] > 0;
    }

    /**
     * Counts total number of persons in database
     *
     * @returns Total count of persons
     *
     * @example
     * ```typescript
     * const total = await repo.count();
     * console.log(`Database contains ${total} persons`);
     * ```
     */
    async count(): Promise<number> {
        const query = `
            SELECT COUNT(*) as total
            FROM dbo.personen
        `;

        const result = await this.querySingle<{ total: number }>(query);
        return result?.total || 0;
    }

    // ==========================================
    // USER-SCOPED METHODS
    // Methods for multi-tenant person management
    // ==========================================

    /**
     * Finds a person by ID scoped to specific user
     *
     * @param id - Person identifier
     * @param userId - User identifier for access control
     * @returns Person object or null if not found or no access
     *
     * @example
     * ```typescript
     * const person = await repo.findByIdForUser(123, userId);
     * ```
     */
    async findByIdForUser(id: number, userId: number): Promise<Persoon | null> {
        const query = `
            SELECT
                p.*,
                r.naam as rol_naam
            FROM dbo.personen p
            LEFT JOIN dbo.rollen r ON p.rol_id = r.id
            WHERE p.id = @id AND p.gebruiker_id = @userId
        `;

        const record = await this.querySingle(query, { id, userId });
        return record ? DbMappers.toPersoon(record) : null;
    }

    /**
     * Creates a new person for specific user
     *
     * @param data - Person data
     * @param userId - User identifier who owns this person
     * @returns Newly created person with generated ID
     * @throws Error if achternaam is missing
     *
     * @example
     * ```typescript
     * const person = await repo.createForUser(data, userId);
     * ```
     */
    async createForUser(data: Partial<Persoon>, userId: number): Promise<Persoon> {
        if (!data.achternaam) {
            throw new Error('Achternaam is required to create a person');
        }

        const dto = DbMappers.toPersoonDto(data as Persoon);

        const query = `
            INSERT INTO dbo.personen (
                voorletters, voornamen, roepnaam, geslacht, tussenvoegsel, achternaam,
                adres, postcode, plaats, geboorteplaats, geboorte_datum, geboorteland,
                nationaliteit_1, nationaliteit_2, telefoon, email, beroep, gebruiker_id
            )
            OUTPUT INSERTED.*
            VALUES (
                @voorletters, @voornamen, @roepnaam, @geslacht, @tussenvoegsel, @achternaam,
                @adres, @postcode, @plaats, @geboorteplaats, @geboorteDatum, @geboorteland,
                @nationaliteit1, @nationaliteit2, @telefoon, @email, @beroep, @gebruikerId
            )
        `;

        const params = {
            voorletters: dto.voorletters,
            voornamen: dto.voornamen,
            roepnaam: dto.roepnaam,
            geslacht: dto.geslacht,
            tussenvoegsel: dto.tussenvoegsel,
            achternaam: dto.achternaam,
            adres: dto.adres,
            postcode: dto.postcode,
            plaats: dto.plaats,
            geboorteplaats: dto.geboorteplaats,
            geboorteDatum: dto.geboorte_datum,
            geboorteland: dto.geboorteland,
            nationaliteit1: dto.nationaliteit_1,
            nationaliteit2: dto.nationaliteit_2,
            telefoon: dto.telefoon,
            email: dto.email,
            beroep: dto.beroep,
            gebruikerId: userId,
        };

        const record = await this.querySingle(query, params);

        if (!record) {
            throw new Error('Failed to create person');
        }

        return DbMappers.toPersoon(record);
    }

    /**
     * Updates a person scoped to specific user
     *
     * @param id - Person ID to update
     * @param data - Partial person data to update
     * @param userId - User identifier for access control
     * @returns Updated person object
     * @throws Error if person not found or no access
     *
     * @example
     * ```typescript
     * const updated = await repo.updateForUser(123, { email: 'new@example.com' }, userId);
     * ```
     */
    async updateForUser(id: number, data: Partial<Persoon>, userId: number): Promise<Persoon> {
        // Check if person exists and belongs to user
        const existing = await this.findByIdForUser(id, userId);
        if (!existing) {
            throw new Error(`Person with ID ${id} not found or access denied`);
        }

        const dto = DbMappers.toPersoonDto({ ...existing, ...data } as Persoon);

        const query = `
            UPDATE dbo.personen
            SET
                voorletters = @voorletters,
                voornamen = @voornamen,
                roepnaam = @roepnaam,
                geslacht = @geslacht,
                tussenvoegsel = @tussenvoegsel,
                achternaam = @achternaam,
                adres = @adres,
                postcode = @postcode,
                plaats = @plaats,
                geboorteplaats = @geboorteplaats,
                geboorte_datum = @geboorteDatum,
                geboorteland = @geboorteland,
                nationaliteit_1 = @nationaliteit1,
                nationaliteit_2 = @nationaliteit2,
                telefoon = @telefoon,
                email = @email,
                beroep = @beroep
            OUTPUT INSERTED.*
            WHERE id = @id AND gebruiker_id = @userId
        `;

        const params = {
            id,
            userId,
            voorletters: dto.voorletters,
            voornamen: dto.voornamen,
            roepnaam: dto.roepnaam,
            geslacht: dto.geslacht,
            tussenvoegsel: dto.tussenvoegsel,
            achternaam: dto.achternaam,
            adres: dto.adres,
            postcode: dto.postcode,
            plaats: dto.plaats,
            geboorteplaats: dto.geboorteplaats,
            geboorteDatum: dto.geboorte_datum,
            geboorteland: dto.geboorteland,
            nationaliteit1: dto.nationaliteit_1,
            nationaliteit2: dto.nationaliteit_2,
            telefoon: dto.telefoon,
            email: dto.email,
            beroep: dto.beroep,
        };

        const record = await this.querySingle(query, params);

        if (!record) {
            throw new Error(`Failed to update person with ID ${id}`);
        }

        return DbMappers.toPersoon(record);
    }

    /**
     * Checks if a person has dependencies in other tables
     *
     * @param id - Person ID to check
     * @returns Object with dependency information
     *
     * @example
     * ```typescript
     * const deps = await repo.checkDependencies(123);
     * if (deps.hasDependencies) {
     *   console.log('Cannot delete:', deps.message);
     * }
     * ```
     */
    async checkDependencies(id: number): Promise<{
        hasDependencies: boolean;
        message: string;
        dependencies: {
            dossiers_partijen: number;
            dossiers_kinderen: number;
            kinderen_ouders_als_kind: number;
            kinderen_ouders_als_ouder: number;
            omgang: number;
            ouderschapsplan_partij1: number;
            ouderschapsplan_partij2: number;
            financiele_afspraken: number;
            bijdragen_kosten: number;
        };
    }> {
        // Check all foreign key references
        const [
            dossiersPartijen,
            dossiersKinderen,
            kinderenOudersKind,
            kinderenOudersOuder,
            omgang,
            ouderschapsPlan1,
            ouderschapsPlan2,
            financieleAfspraken,
            bijdragenKosten
        ] = await Promise.all([
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.dossiers_partijen WHERE persoon_id = @id`, { id }),
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.dossiers_kinderen WHERE kind_id = @id`, { id }),
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.kinderen_ouders WHERE kind_id = @id`, { id }),
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.kinderen_ouders WHERE ouder_id = @id`, { id }),
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.omgang WHERE verzorger_id = @id`, { id }),
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.ouderschapsplan_info WHERE partij_1_persoon_id = @id`, { id }),
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.ouderschapsplan_info WHERE partij_2_persoon_id = @id`, { id }),
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.financiele_afspraken_kinderen WHERE kind_id = @id`, { id }),
            this.querySingle<{ count: number }>(`SELECT COUNT(*) as count FROM dbo.bijdragen_kosten_kinderen WHERE personen_id = @id`, { id })
        ]);

        const dependencies = {
            dossiers_partijen: dossiersPartijen?.count || 0,
            dossiers_kinderen: dossiersKinderen?.count || 0,
            kinderen_ouders_als_kind: kinderenOudersKind?.count || 0,
            kinderen_ouders_als_ouder: kinderenOudersOuder?.count || 0,
            omgang: omgang?.count || 0,
            ouderschapsplan_partij1: ouderschapsPlan1?.count || 0,
            ouderschapsplan_partij2: ouderschapsPlan2?.count || 0,
            financiele_afspraken: financieleAfspraken?.count || 0,
            bijdragen_kosten: bijdragenKosten?.count || 0
        };

        const totalDependencies = Object.values(dependencies).reduce((sum, count) => sum + count, 0);
        const hasDependencies = totalDependencies > 0;

        let message = '';
        if (hasDependencies) {
            const parts: string[] = [];
            if (dependencies.dossiers_partijen > 0) parts.push(`${dependencies.dossiers_partijen} dossier(s) as partij`);
            if (dependencies.dossiers_kinderen > 0) parts.push(`${dependencies.dossiers_kinderen} dossier(s) as kind`);
            if (dependencies.kinderen_ouders_als_kind > 0) parts.push(`${dependencies.kinderen_ouders_als_kind} ouder relatie(s)`);
            if (dependencies.kinderen_ouders_als_ouder > 0) parts.push(`${dependencies.kinderen_ouders_als_ouder} kind relatie(s)`);
            if (dependencies.omgang > 0) parts.push(`${dependencies.omgang} omgang regeling(en)`);
            if (dependencies.ouderschapsplan_partij1 > 0 || dependencies.ouderschapsplan_partij2 > 0) {
                parts.push(`${dependencies.ouderschapsplan_partij1 + dependencies.ouderschapsplan_partij2} ouderschapsplan(nen)`);
            }
            if (dependencies.financiele_afspraken > 0) parts.push(`${dependencies.financiele_afspraken} financiele afspraak/afspraken`);
            if (dependencies.bijdragen_kosten > 0) parts.push(`${dependencies.bijdragen_kosten} bijdrage(n)`);

            message = `Deze persoon kan niet worden verwijderd omdat deze nog is gekoppeld aan: ${parts.join(', ')}. Verwijder eerst deze koppelingen.`;
        }

        return {
            hasDependencies,
            message,
            dependencies
        };
    }

    /**
     * Deletes a person scoped to specific user
     * Checks for dependencies first and throws error if found
     *
     * @param id - Person ID to delete
     * @param userId - User identifier for access control
     * @returns True if deletion successful, false if person not found or no access
     * @throws Error if person has dependencies
     *
     * @example
     * ```typescript
     * const deleted = await repo.deleteForUser(123, userId);
     * ```
     */
    async deleteForUser(id: number, userId: number): Promise<boolean> {
        // Check for dependencies first
        const dependencyCheck = await this.checkDependencies(id);
        if (dependencyCheck.hasDependencies) {
            throw new Error(dependencyCheck.message);
        }

        const query = `
            DELETE FROM dbo.personen
            WHERE id = @id AND gebruiker_id = @userId
        `;

        const result = await this.executeQuery(query, { id, userId });
        return result.rowsAffected[0] > 0;
    }

    /**
     * Checks if email is unique within user's persons
     *
     * @param email - Email address to check
     * @param userId - User identifier for scoping
     * @param excludeId - Optional person ID to exclude from check
     * @returns True if email is unique within user scope
     *
     * @example
     * ```typescript
     * const isUnique = await repo.checkEmailUniqueForUser('test@example.com', userId, 123);
     * ```
     */
    async checkEmailUniqueForUser(email: string, userId: number, excludeId?: number): Promise<boolean> {
        let query = `
            SELECT COUNT(*) as count
            FROM dbo.personen
            WHERE email = @email AND gebruiker_id = @userId
        `;

        const params: Record<string, any> = { email, userId };

        if (excludeId !== undefined) {
            query += ' AND id != @excludeId';
            params.excludeId = excludeId;
        }

        const result = await this.querySingle<{ count: number }>(query, params);
        return result ? result.count === 0 : true;
    }

    /**
     * Finds all persons for specific user with pagination
     *
     * @param userId - User identifier
     * @param filters - Optional pagination filters
     * @returns Array of persons belonging to user
     *
     * @example
     * ```typescript
     * const persons = await repo.findAllForUser(userId, { limit: 50, offset: 0 });
     * ```
     */
    async findAllForUser(userId: number, filters?: { limit?: number; offset?: number }): Promise<Persoon[]> {
        const limit = Math.min(filters?.limit || 50, 100);
        const offset = filters?.offset || 0;

        const query = `
            SELECT *
            FROM dbo.personen
            WHERE gebruiker_id = @userId
            ORDER BY id
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const records = await this.queryMany(query, { userId, limit, offset });
        return records.map(DbMappers.toPersoon);
    }

    /**
     * Counts persons for specific user
     *
     * @param userId - User identifier
     * @returns Count of persons belonging to user
     *
     * @example
     * ```typescript
     * const total = await repo.countForUser(userId);
     * ```
     */
    async countForUser(userId: number): Promise<number> {
        const query = `
            SELECT COUNT(*) as total
            FROM dbo.personen
            WHERE gebruiker_id = @userId
        `;

        const result = await this.querySingle<{ total: number }>(query, { userId });
        return result?.total || 0;
    }
}
