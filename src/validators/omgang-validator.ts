import Joi from 'joi';

export const wisselTijdPattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createOmgangSchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).required(),
    dagdeelId: Joi.number().integer().positive().required(),
    verzorgerId: Joi.number().integer().positive().required(),
    wisselTijd: Joi.string().allow('').optional(),
    weekRegelingId: Joi.number().integer().positive().required(),
    weekRegelingAnders: Joi.string().allow('').optional()
});

export const updateOmgangSchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).optional(),
    dagdeelId: Joi.number().integer().positive().optional(),
    verzorgerId: Joi.number().integer().positive().optional(),
    wisselTijd: Joi.string().allow('').optional(),
    weekRegelingId: Joi.number().integer().positive().optional(),
    weekRegelingAnders: Joi.string().allow('').optional()
});

export const omgangEntrySchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).required(),
    dagdeelId: Joi.number().integer().positive().required(),
    verzorgerId: Joi.number().integer().positive().required(),
    wisselTijd: Joi.string().allow('').optional(),
    weekRegelingId: Joi.number().integer().positive().required(),
    weekRegelingAnders: Joi.string().allow('').optional()
});

export const createOmgangBatchSchema = Joi.object({
    entries: Joi.array().items(omgangEntrySchema).min(1).max(100).required()
});

export const dagdeelSchema = Joi.object({
    dagdeelId: Joi.number().integer().positive().required(),
    verzorgerId: Joi.number().integer().positive().required()
});

export const omgangDaySchema = Joi.object({
    dagId: Joi.number().integer().min(1).max(7).required(),
    wisselTijd: Joi.string().allow('').optional(),
    dagdelen: Joi.array().items(dagdeelSchema).min(1).required()
});

export const omgangWeekSchema = Joi.object({
    weekRegelingId: Joi.number().integer().positive().required(),
    days: Joi.array().items(omgangDaySchema).min(1).max(7).required(),
    weekRegelingAnders: Joi.string().allow('').optional()
});

// Validation functions
export const validateCreateOmgang = (data: any) => {
    return createOmgangSchema.validate(data, { abortEarly: false });
};

export const validateUpdateOmgang = (data: any) => {
    return updateOmgangSchema.validate(data, { abortEarly: false });
};

export const validateCreateOmgangBatch = (data: any) => {
    return createOmgangBatchSchema.validate(data, { abortEarly: false });
};

export const validateOmgangWeek = (data: any) => {
    return omgangWeekSchema.validate(data, { abortEarly: false });
};