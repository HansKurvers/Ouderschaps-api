import Joi from 'joi';

/**
 * Validator for creating new zorg records
 *
 * Business Rules:
 * - dossierId must exist and user must have access (validated separately in service)
 * - zorgCategorieId must exist in zorg_categorieen table
 * - zorgSituatieId must exist in zorg_situaties table
 * - zorgSituatie must belong to the selected zorgCategorie (validated separately)
 * - overeenkomst is required and must be between 1-5000 characters
 * - situatieAnders is optional (max 500 characters)
 * - aangemaaktDoor is required to track who created the record
 */
export const createZorgSchema = Joi.object({
    dossierId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Dossier ID must be a number',
            'number.integer': 'Dossier ID must be an integer',
            'number.positive': 'Dossier ID must be positive',
            'any.required': 'Dossier ID is required'
        }),

    zorgCategorieId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Zorg categorie ID must be a number',
            'number.integer': 'Zorg categorie ID must be an integer',
            'number.positive': 'Zorg categorie ID must be positive',
            'any.required': 'Zorg categorie is required'
        }),

    zorgSituatieId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Zorg situatie ID must be a number',
            'number.integer': 'Zorg situatie ID must be an integer',
            'number.positive': 'Zorg situatie ID must be positive',
            'any.required': 'Zorg situatie is required'
        }),

    overeenkomst: Joi.string().min(1).max(5000).required()
        .messages({
            'string.base': 'Overeenkomst must be a string',
            'string.empty': 'Overeenkomst mag niet leeg zijn',
            'string.min': 'Overeenkomst mag niet leeg zijn',
            'string.max': 'Overeenkomst mag maximaal 5000 karakters zijn',
            'any.required': 'Overeenkomst is required'
        }),

    situatieAnders: Joi.string().max(500).optional().allow('', null)
        .messages({
            'string.base': 'Situatie anders must be a string',
            'string.max': 'Situatie anders mag maximaal 500 karakters zijn'
        }),

    aangemaaktDoor: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Aangemaakt door must be a number',
            'number.integer': 'Aangemaakt door must be an integer',
            'number.positive': 'Aangemaakt door must be positive',
            'any.required': 'Aangemaakt door is required'
        })
});

/**
 * Validator for updating existing zorg records
 *
 * Business Rules:
 * - At least one field besides gewijzigdDoor must be provided
 * - If zorgCategorieId is changed, zorgSituatieId must be validated
 * - gewijzigdDoor is required to track who modified the record
 * - All fields are optional except gewijzigdDoor
 */
export const updateZorgSchema = Joi.object({
    zorgCategorieId: Joi.number().integer().positive().optional()
        .messages({
            'number.base': 'Zorg categorie ID must be a number',
            'number.integer': 'Zorg categorie ID must be an integer',
            'number.positive': 'Zorg categorie ID must be positive'
        }),

    zorgSituatieId: Joi.number().integer().positive().optional()
        .messages({
            'number.base': 'Zorg situatie ID must be a number',
            'number.integer': 'Zorg situatie ID must be an integer',
            'number.positive': 'Zorg situatie ID must be positive'
        }),

    overeenkomst: Joi.string().min(1).max(5000).optional()
        .messages({
            'string.base': 'Overeenkomst must be a string',
            'string.empty': 'Overeenkomst mag niet leeg zijn',
            'string.min': 'Overeenkomst mag niet leeg zijn',
            'string.max': 'Overeenkomst mag maximaal 5000 karakters zijn'
        }),

    situatieAnders: Joi.string().max(500).optional().allow('', null)
        .messages({
            'string.base': 'Situatie anders must be a string',
            'string.max': 'Situatie anders mag maximaal 500 karakters zijn'
        }),

    gewijzigdDoor: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Gewijzigd door must be a number',
            'number.integer': 'Gewijzigd door must be an integer',
            'number.positive': 'Gewijzigd door must be positive',
            'any.required': 'Gewijzigd door is required'
        })
}).min(2).messages({
    'object.min': 'At least one field besides gewijzigdDoor must be provided for update'
});

/**
 * Helper function to validate create zorg data
 *
 * @param data - The data to validate
 * @returns Joi validation result with error or validated value
 */
export function validateCreateZorg(data: any) {
    return createZorgSchema.validate(data, { abortEarly: false });
}

/**
 * Helper function to validate update zorg data
 *
 * @param data - The data to validate
 * @returns Joi validation result with error or validated value
 */
export function validateUpdateZorg(data: any) {
    return updateZorgSchema.validate(data, { abortEarly: false });
}
