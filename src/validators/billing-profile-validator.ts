/**
 * Validation schemas for user billing profile
 */

import Joi from 'joi';

/**
 * Dutch postcode pattern: 1234 AB or 1234AB
 */
const dutchPostcodePattern = /^[1-9][0-9]{3}\s?[A-Z]{2}$/i;

/**
 * Dutch phone number pattern (basic validation)
 * Accepts: +31612345678, 0612345678, 06-12345678, etc.
 */
const dutchPhonePattern = /^(\+31|0)[1-9][0-9]{8}$/;

/**
 * BTW nummer pattern (NL123456789B01)
 */
const btwNummerPattern = /^[A-Z]{2}[0-9]{9}B[0-9]{2}$/i;

/**
 * KvK nummer pattern (8 digits)
 */
const kvkNummerPattern = /^[0-9]{8}$/;

/**
 * Validation schema for updating billing profile
 */
export const updateBillingProfileSchema = Joi.object({
    klant_type: Joi.string()
        .valid('particulier', 'zakelijk')
        .required()
        .messages({
            'any.required': 'Klanttype is verplicht',
            'any.only': 'Klanttype moet "particulier" of "zakelijk" zijn'
        }),

    telefoon: Joi.string()
        .pattern(dutchPhonePattern)
        .optional()
        .allow('', null)
        .messages({
            'string.pattern.base': 'Ongeldig telefoonnummer (verwacht formaat: 0612345678 of +31612345678)'
        }),

    // Address fields (required)
    straat: Joi.string()
        .max(255)
        .required()
        .messages({
            'any.required': 'Straatnaam is verplicht',
            'string.max': 'Straatnaam mag maximaal 255 tekens bevatten'
        }),

    huisnummer: Joi.string()
        .max(10)
        .required()
        .messages({
            'any.required': 'Huisnummer is verplicht',
            'string.max': 'Huisnummer mag maximaal 10 tekens bevatten'
        }),

    postcode: Joi.string()
        .pattern(dutchPostcodePattern)
        .required()
        .messages({
            'any.required': 'Postcode is verplicht',
            'string.pattern.base': 'Ongeldige postcode (verwacht formaat: 1234 AB)'
        }),

    plaats: Joi.string()
        .max(100)
        .required()
        .messages({
            'any.required': 'Plaatsnaam is verplicht',
            'string.max': 'Plaatsnaam mag maximaal 100 tekens bevatten'
        }),

    land: Joi.string()
        .length(2)
        .uppercase()
        .default('NL')
        .optional()
        .messages({
            'string.length': 'Landcode moet 2 letters zijn (bijv. NL, BE, DE)',
            'string.uppercase': 'Landcode moet in hoofdletters zijn'
        }),

    // Business fields (conditional - only for zakelijk)
    bedrijfsnaam: Joi.when('klant_type', {
        is: 'zakelijk',
        then: Joi.string()
            .max(255)
            .required()
            .messages({
                'any.required': 'Bedrijfsnaam is verplicht voor zakelijke klanten',
                'string.max': 'Bedrijfsnaam mag maximaal 255 tekens bevatten'
            }),
        otherwise: Joi.string().optional().allow('', null)
    }),

    btw_nummer: Joi.when('klant_type', {
        is: 'zakelijk',
        then: Joi.string()
            .pattern(btwNummerPattern)
            .optional()
            .allow('', null)
            .messages({
                'string.pattern.base': 'Ongeldig BTW-nummer (verwacht formaat: NL123456789B01)'
            }),
        otherwise: Joi.string().optional().allow('', null)
    }),

    kvk_nummer: Joi.when('klant_type', {
        is: 'zakelijk',
        then: Joi.string()
            .pattern(kvkNummerPattern)
            .optional()
            .allow('', null)
            .messages({
                'string.pattern.base': 'Ongeldig KvK-nummer (verwacht: 8 cijfers)'
            }),
        otherwise: Joi.string().optional().allow('', null)
    })
});

/**
 * Validate billing profile update data
 */
export const validateBillingProfile = (data: any) => {
    return updateBillingProfileSchema.validate(data, { abortEarly: false });
};
