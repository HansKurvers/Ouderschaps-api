import Joi from 'joi';

export const createZorgSchema = Joi.object({
    zorgCategorieId: Joi.number().integer().positive().required(),
    zorgSituatieId: Joi.number().integer().positive().required(),
    situatieAnders: Joi.string().max(500).optional(),
    overeenkomst: Joi.string().max(5000).required()
});

export const updateZorgSchema = Joi.object({
    zorgCategorieId: Joi.number().integer().positive().optional(),
    zorgSituatieId: Joi.number().integer().positive().optional(),
    situatieAnders: Joi.string().max(500).optional(),
    overeenkomst: Joi.string().max(5000).optional()
});

// Validation functions
export const validateCreateZorg = (data: any) => {
    return createZorgSchema.validate(data, { abortEarly: false });
};

export const validateUpdateZorg = (data: any) => {
    return updateZorgSchema.validate(data, { abortEarly: false });
};