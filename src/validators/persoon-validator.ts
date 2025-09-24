import Joi from 'joi';
import { Geslacht } from '../models/Dossier';

// Normalize field names from snake_case to camelCase for backwards compatibility
function normalizePersonFields(data: any): any {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const normalized = { ...data };

    // Map snake_case fields to camelCase
    const fieldMappings = {
        'geboorte_datum': 'geboorteDatum',
        'geboorte_plaats': 'geboorteplaats'
    };

    for (const [snakeCase, camelCase] of Object.entries(fieldMappings)) {
        if (snakeCase in normalized) {
            // Only use snake_case value if camelCase version doesn't exist
            if (!(camelCase in normalized)) {
                normalized[camelCase] = normalized[snakeCase];
            }
            // Remove the snake_case version
            delete normalized[snakeCase];
        }
    }

    return normalized;
}

export const persoonSchema = Joi.object({
    voorletters: Joi.string().max(10).optional(),
    voornamen: Joi.string().max(100).optional(),
    roepnaam: Joi.string().max(50).optional(),
    geslacht: Joi.string().valid(...Object.values(Geslacht)).optional(),
    tussenvoegsel: Joi.string().max(20).optional(),
    achternaam: Joi.string().max(100).required(),
    adres: Joi.string().max(200).optional(),
    postcode: Joi.string().pattern(/^\d{4}\s?[A-Z]{2}$/).optional(),
    plaats: Joi.string().max(100).optional(),
    geboorteplaats: Joi.string().max(255).optional(),
    geboorteDatum: Joi.date().iso().max('now').optional(),
    nationaliteit1: Joi.string().max(50).optional(),
    nationaliteit2: Joi.string().max(50).optional(),
    telefoon: Joi.string().max(20).optional(),
    email: Joi.string().email().max(100).optional(),
    beroep: Joi.string().max(100).optional()
});

export const addPartijSchema = Joi.object({
    persoonId: Joi.number().integer().positive().optional(),
    rolId: Joi.number().integer().positive().required(),
    persoonData: persoonSchema.optional()
}).xor('persoonId', 'persoonData');

export const updatePersoonSchema = Joi.object({
    voorletters: Joi.string().max(10).optional(),
    voornamen: Joi.string().max(100).optional(),
    roepnaam: Joi.string().max(50).optional(),
    geslacht: Joi.string().valid(...Object.values(Geslacht)).optional(),
    tussenvoegsel: Joi.string().max(20).optional(),
    achternaam: Joi.string().max(100).optional(),
    adres: Joi.string().max(200).optional(),
    postcode: Joi.string().pattern(/^\d{4}\s?[A-Z]{2}$/).optional(),
    plaats: Joi.string().max(100).optional(),
    geboorteplaats: Joi.string().max(255).optional(),
    geboorteDatum: Joi.date().iso().max('now').optional(),
    nationaliteit1: Joi.string().max(50).optional(),
    nationaliteit2: Joi.string().max(50).optional(),
    telefoon: Joi.string().max(20).optional(),
    email: Joi.string().email().max(100).optional(),
    beroep: Joi.string().max(100).optional()
});

export const validatePersoon = (data: any) => {
    // Normalize field names from snake_case to camelCase if present
    const normalizedData = normalizePersonFields(data);
    return persoonSchema.validate(normalizedData, { abortEarly: false });
};

export const validateUpdatePersoon = (data: any) => {
    // Normalize field names from snake_case to camelCase if present
    const normalizedData = normalizePersonFields(data);
    return updatePersoonSchema.validate(normalizedData, { abortEarly: false });
};

export const validateAddPartij = (data: any) => {
    return addPartijSchema.validate(data, { abortEarly: false });
};