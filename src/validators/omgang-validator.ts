import Joi from 'joi';

export const wisselTijdPattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createOmgangSchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).required(),
    dagdeelId: Joi.number().integer().positive().required(),
    verzorgerId: Joi.number().integer().positive().required(),
    wisselTijd: Joi.string().pattern(wisselTijdPattern).optional(),
    weekRegelingId: Joi.number().integer().positive().required(),
    weekRegelingAnders: Joi.string().max(255).when('weekRegelingId', {
        is: 4,  // ID voor "Anders"
        then: Joi.required(),
        otherwise: Joi.optional()
    })
});

export const updateOmgangSchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).optional(),
    dagdeelId: Joi.number().integer().positive().optional(),
    verzorgerId: Joi.number().integer().positive().optional(),
    wisselTijd: Joi.string().pattern(wisselTijdPattern).optional(),
    weekRegelingId: Joi.number().integer().positive().optional(),
    weekRegelingAnders: Joi.string().max(255).when('weekRegelingId', {
        is: 4,  // ID voor "Anders"
        then: Joi.required(),
        otherwise: Joi.optional()
    })
});

// Validation functions
export const validateCreateOmgang = (data: any) => {
    return createOmgangSchema.validate(data, { abortEarly: false });
};

export const validateUpdateOmgang = (data: any) => {
    return updateOmgangSchema.validate(data, { abortEarly: false });
};