import Joi from 'joi';

/**
 * Validator for omgang (visitation/contact schedule) records
 *
 * Business Rules:
 * - dagId must be between 1-7 (Maandag through Zondag)
 * - dagdeelId must be between 1-4 (Ochtend, Middag, Avond, Nacht)
 * - verzorgerId must be a partij in the dossier (validated separately)
 * - wisselTijd format must be HH:MM (24-hour format)
 * - weekRegelingAnders max 255 characters
 */

// Time format validation: HH:MM (24-hour)
export const wisselTijdPattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createOmgangSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Dossier ID must be a number',
            'number.integer': 'Dossier ID must be an integer',
            'number.positive': 'Dossier ID must be positive',
            'any.required': 'Dossier ID is required'
        }),

    dagId: Joi.number().integer().min(1).max(7).required()
        .messages({
            'number.base': 'Dag ID must be a number',
            'number.integer': 'Dag ID must be an integer',
            'number.min': 'Dag ID must be between 1-7 (Monday-Sunday)',
            'number.max': 'Dag ID must be between 1-7 (Monday-Sunday)',
            'any.required': 'Dag is required'
        }),

    dagdeelId: Joi.number().integer().min(1).max(4).required()
        .messages({
            'number.base': 'Dagdeel ID must be a number',
            'number.integer': 'Dagdeel ID must be an integer',
            'number.min': 'Dagdeel ID must be between 1-4 (Ochtend-Nacht)',
            'number.max': 'Dagdeel ID must be between 1-4 (Ochtend-Nacht)',
            'any.required': 'Dagdeel is required'
        }),

    verzorgerId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Verzorger ID must be a number',
            'number.integer': 'Verzorger ID must be an integer',
            'number.positive': 'Verzorger ID must be positive',
            'any.required': 'Verzorger is required'
        }),

    wisselTijd: Joi.string().pattern(wisselTijdPattern).allow('', null).optional()
        .messages({
            'string.base': 'Wissel tijd must be a string',
            'string.pattern.base': 'Wissel tijd must be in format HH:MM (24-hour), e.g., 08:30 or 14:00'
        }),

    weekRegelingId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Week regeling ID must be a number',
            'number.integer': 'Week regeling ID must be an integer',
            'number.positive': 'Week regeling ID must be positive',
            'any.required': 'Week regeling is required'
        }),

    weekRegelingAnders: Joi.string().max(255).allow('', null).optional()
        .messages({
            'string.base': 'Week regeling anders must be a string',
            'string.max': 'Week regeling anders mag maximaal 255 karakters zijn'
        })
});

export const updateOmgangSchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).optional()
        .messages({
            'number.base': 'Dag ID must be a number',
            'number.integer': 'Dag ID must be an integer',
            'number.min': 'Dag ID must be between 1-7 (Monday-Sunday)',
            'number.max': 'Dag ID must be between 1-7 (Monday-Sunday)'
        }),

    dagdeelId: Joi.number().integer().min(1).max(4).optional()
        .messages({
            'number.base': 'Dagdeel ID must be a number',
            'number.integer': 'Dagdeel ID must be an integer',
            'number.min': 'Dagdeel ID must be between 1-4 (Ochtend-Nacht)',
            'number.max': 'Dagdeel ID must be between 1-4 (Ochtend-Nacht)'
        }),

    verzorgerId: Joi.number().integer().positive().optional()
        .messages({
            'number.base': 'Verzorger ID must be a number',
            'number.integer': 'Verzorger ID must be an integer',
            'number.positive': 'Verzorger ID must be positive'
        }),

    wisselTijd: Joi.string().pattern(wisselTijdPattern).allow('', null).optional()
        .messages({
            'string.base': 'Wissel tijd must be a string',
            'string.pattern.base': 'Wissel tijd must be in format HH:MM (24-hour), e.g., 08:30 or 14:00'
        }),

    weekRegelingId: Joi.number().integer().positive().optional()
        .messages({
            'number.base': 'Week regeling ID must be a number',
            'number.integer': 'Week regeling ID must be an integer',
            'number.positive': 'Week regeling ID must be positive'
        }),

    weekRegelingAnders: Joi.string().max(255).allow('', null).optional()
        .messages({
            'string.base': 'Week regeling anders must be a string',
            'string.max': 'Week regeling anders mag maximaal 255 karakters zijn'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

// Legacy batch schema for compatibility
export const omgangEntrySchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).required(),
    dagdeelId: Joi.number().integer().min(1).max(4).required(),
    verzorgerId: Joi.number().integer().positive().required(),
    wisselTijd: Joi.string().pattern(wisselTijdPattern).allow('', null).optional(),
    weekRegelingId: Joi.number().integer().positive().required(),
    weekRegelingAnders: Joi.string().max(255).allow('', null).optional()
});

export const createOmgangBatchSchema = Joi.object({
    entries: Joi.array().items(omgangEntrySchema).min(1).max(100).required()
});

export const dagdeelSchema = Joi.object({
    dagdeelId: Joi.number().integer().min(1).max(4).required(),
    verzorgerId: Joi.number().integer().positive().required()
});

export const omgangDaySchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).required(),
    wisselTijd: Joi.string().pattern(wisselTijdPattern).allow('', null).optional(),
    dagdelen: Joi.array().items(dagdeelSchema).min(1).required()
});

export const omgangWeekSchema = Joi.object({
    weekRegelingId: Joi.number().integer().positive().required(),
    days: Joi.array().items(omgangDaySchema).min(0).max(7).required(),
    weekRegelingAnders: Joi.string().max(255).allow('', null).optional()
});

/**
 * Helper function to validate create omgang data
 *
 * @param data - The data to validate
 * @returns Joi validation result with error or validated value
 */
export function validateCreateOmgang(data: any) {
    return createOmgangSchema.validate(data, { abortEarly: false });
}

/**
 * Helper function to validate update omgang data
 *
 * @param data - The data to validate
 * @returns Joi validation result with error or validated value
 */
export function validateUpdateOmgang(data: any) {
    return updateOmgangSchema.validate(data, { abortEarly: false });
}

/**
 * Helper function to validate batch create omgang data
 *
 * @param data - The data to validate
 * @returns Joi validation result with error or validated value
 */
export function validateCreateOmgangBatch(data: any) {
    return createOmgangBatchSchema.validate(data, { abortEarly: false });
}

/**
 * Helper function to validate omgang week data
 *
 * @param data - The data to validate
 * @returns Joi validation result with error or validated value
 */
export function validateOmgangWeek(data: any) {
    return omgangWeekSchema.validate(data, { abortEarly: false });
}
