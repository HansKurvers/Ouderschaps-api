import Joi from 'joi';
import { Geslacht } from '../models/Dossier';
import { persoonSchema } from './persoon-validator';

export const kindDataSchema = Joi.object({
    voorletters: Joi.string().max(10).optional(),
    voornamen: Joi.string().max(100).optional(),
    roepnaam: Joi.string().max(50).optional(),
    geslacht: Joi.string().valid(...Object.values(Geslacht)).optional(),
    tussenvoegsel: Joi.string().max(20).optional(),
    achternaam: Joi.string().max(100).required(),
    adres: Joi.string().max(200).optional(),
    postcode: Joi.string().pattern(/^\d{4}\s?[A-Z]{2}$/).optional(),
    plaats: Joi.string().max(100).optional(),
    geboortePlaats: Joi.string().max(100).optional(),
    geboorteplaats: Joi.string().max(100).optional(),
    geboorteDatum: Joi.date().iso().max('now').optional(),
    geboorte_datum: Joi.date().iso().max('now').optional(),
    geboorteland: Joi.string().max(100).optional(),
    nationaliteit1: Joi.string().max(50).optional(),
    nationaliteit_1: Joi.string().max(50).optional(),
    nationaliteit2: Joi.string().max(50).optional(),
    nationaliteit_2: Joi.string().max(50).optional(),
    telefoon: Joi.string().max(20).optional(),
    email: Joi.string().email().max(100).optional(),
    beroep: Joi.string().max(100).optional()
});

export const ouderRelatieItemSchema = Joi.object({
    ouderId: Joi.number().integer().positive().required(),
    relatieTypeId: Joi.number().integer().positive().required()
});

export const addKindSchema = Joi.object({
    kindId: Joi.number().integer().positive().optional(),
    kindData: kindDataSchema.optional(),
    ouderRelaties: Joi.array().items(ouderRelatieItemSchema).optional()
}).xor('kindId', 'kindData');

export const ouderRelatieSchema = Joi.object({
    ouderId: Joi.number().integer().positive().optional(),
    ouderData: persoonSchema.optional(),
    relatieTypeId: Joi.number().integer().positive().required()
}).xor('ouderId', 'ouderData');

export const updateRelatieTypeSchema = Joi.object({
    relatieTypeId: Joi.number().integer().positive().required()
});

// Validation functions
export const validateKindData = (data: any) => {
    return kindDataSchema.validate(data, { abortEarly: false });
};

export const validateAddKind = (data: any) => {
    return addKindSchema.validate(data, { abortEarly: false });
};

export const validateOuderRelatie = (data: any) => {
    return ouderRelatieSchema.validate(data, { abortEarly: false });
};

export const validateUpdateRelatieType = (data: any) => {
    return updateRelatieTypeSchema.validate(data, { abortEarly: false });
};