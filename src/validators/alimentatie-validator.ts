import Joi from 'joi';
import { AlimentatieFrequentie } from '../models/Dossier';

/**
 * Validator for creating new alimentatie records
 *
 * Business Rules:
 * - Betaler and ontvanger must be different persons
 * - Both must be partijen in the dossier (validated separately in service)
 * - Bedrag must be positive (> 0)
 * - Einddatum must be after ingangsdatum (if provided)
 * - Frequentie must be one of the valid enum values
 */
export const createAlimentatieSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Dossier ID must be a number',
            'number.positive': 'Dossier ID must be positive',
            'any.required': 'Dossier ID is required'
        }),

    betalerId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Betaler ID must be a number',
            'number.positive': 'Betaler ID must be positive',
            'any.required': 'Betaler ID is required'
        }),

    ontvangerId: Joi.number().integer().positive().required()
        .invalid(Joi.ref('betalerId'))
        .messages({
            'number.base': 'Ontvanger ID must be a number',
            'number.positive': 'Ontvanger ID must be positive',
            'any.required': 'Ontvanger ID is required',
            'any.invalid': 'Ontvanger moet verschillend zijn van betaler'
        }),

    bedrag: Joi.number().positive().precision(2).required()
        .messages({
            'number.base': 'Bedrag must be a number',
            'number.positive': 'Bedrag moet positief zijn',
            'any.required': 'Bedrag is required'
        }),

    frequentie: Joi.string()
        .valid(...Object.values(AlimentatieFrequentie))
        .required()
        .messages({
            'string.base': 'Frequentie must be a string',
            'any.only': 'Frequentie must be one of: per maand, per week, per jaar, eenmalig',
            'any.required': 'Frequentie is required'
        }),

    ingangsdatum: Joi.date().iso().required()
        .messages({
            'date.base': 'Ingangsdatum must be a valid date',
            'date.format': 'Ingangsdatum must be in ISO format',
            'any.required': 'Ingangsdatum is required'
        }),

    einddatum: Joi.date().iso().min(Joi.ref('ingangsdatum')).optional()
        .messages({
            'date.base': 'Einddatum must be a valid date',
            'date.format': 'Einddatum must be in ISO format',
            'date.min': 'Einddatum moet na ingangsdatum liggen'
        }),

    opmerkingen: Joi.string().max(1000).optional()
        .messages({
            'string.base': 'Opmerkingen must be a string',
            'string.max': 'Opmerkingen cannot exceed 1000 characters'
        })
});

/**
 * Validator for updating existing alimentatie records
 *
 * All fields are optional, but at least one must be provided
 */
export const updateAlimentatieSchema = Joi.object({
    bedrag: Joi.number().positive().precision(2).optional()
        .messages({
            'number.base': 'Bedrag must be a number',
            'number.positive': 'Bedrag moet positief zijn'
        }),

    frequentie: Joi.string()
        .valid(...Object.values(AlimentatieFrequentie))
        .optional()
        .messages({
            'string.base': 'Frequentie must be a string',
            'any.only': 'Frequentie must be one of: per maand, per week, per jaar, eenmalig'
        }),

    ingangsdatum: Joi.date().iso().optional()
        .messages({
            'date.base': 'Ingangsdatum must be a valid date',
            'date.format': 'Ingangsdatum must be in ISO format'
        }),

    einddatum: Joi.date().iso().optional()
        .messages({
            'date.base': 'Einddatum must be a valid date',
            'date.format': 'Einddatum must be in ISO format'
        }),

    opmerkingen: Joi.string().max(1000).optional().allow('', null)
        .messages({
            'string.base': 'Opmerkingen must be a string',
            'string.max': 'Opmerkingen cannot exceed 1000 characters'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

/**
 * Helper function to validate create alimentatie data
 */
export function validateCreateAlimentatie(data: any) {
    return createAlimentatieSchema.validate(data, { abortEarly: false });
}

/**
 * Helper function to validate update alimentatie data
 */
export function validateUpdateAlimentatie(data: any) {
    return updateAlimentatieSchema.validate(data, { abortEarly: false });
}