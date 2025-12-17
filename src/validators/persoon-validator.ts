import Joi from 'joi';
import { Geslacht } from '../models/Dossier';

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
    geboorte_plaats: Joi.string().max(255).optional(),
    geboorteDatum: Joi.date().iso().max('now').optional(),
    geboorte_datum: Joi.date().iso().max('now').optional(),
    geboorteland: Joi.string().max(100).optional(),
    nationaliteit1: Joi.string().max(50).optional(),
    nationaliteit_1: Joi.string().max(50).optional(),
    nationaliteit2: Joi.string().max(50).optional(),
    nationaliteit_2: Joi.string().max(50).optional(),
    telefoon: Joi.string().max(20).optional(),
    email: Joi.string().email().max(100).optional(),
    beroep: Joi.string().max(100).optional(),
    rolId: Joi.number().integer().positive().optional()
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
    geboorte_plaats: Joi.string().max(255).optional(),
    geboorteDatum: Joi.date().iso().max('now').optional(),
    geboorte_datum: Joi.date().iso().max('now').optional(),
    geboorteland: Joi.string().max(100).optional(),
    nationaliteit1: Joi.string().max(50).optional(),
    nationaliteit_1: Joi.string().max(50).optional(),
    nationaliteit2: Joi.string().max(50).optional(),
    nationaliteit_2: Joi.string().max(50).optional(),
    telefoon: Joi.string().max(20).optional(),
    email: Joi.string().email().max(100).optional(),
    beroep: Joi.string().max(100).optional(),
    rolId: Joi.number().integer().positive().optional()
});

export const validatePersoon = (data: any) => {
    return persoonSchema.validate(data, { abortEarly: false });
};

export const validateUpdatePersoon = (data: any) => {
    return updatePersoonSchema.validate(data, { abortEarly: false });
};

export const validateAddPartij = (data: any) => {
    return addPartijSchema.validate(data, { abortEarly: false });
};