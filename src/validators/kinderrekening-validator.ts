import Joi from 'joi';

/**
 * Kinderrekening IBAN Validator (V6)
 *
 * NOTE: IBAN format validation happens on the frontend!
 * Backend only validates:
 * - Array structure
 * - Required fields presence
 * - Field max lengths
 * - Basic string formats
 *
 * Frontend is responsible for:
 * - IBAN checksum validation
 * - IBAN country code validation
 * - IBAN formatting with spaces
 */

export const kinderrekeningIBANSchema = Joi.object({
    iban: Joi.string()
        .trim()
        .max(34) // Max IBAN length (international standard)
        .required()
        .messages({
            'string.empty': 'IBAN is verplicht',
            'string.max': 'IBAN mag maximaal 34 karakters zijn',
            'any.required': 'IBAN is verplicht'
        }),

    tenaamstelling: Joi.string()
        .trim()
        .max(100)
        .required()
        .messages({
            'string.empty': 'Tenaamstelling is verplicht',
            'string.max': 'Tenaamstelling mag maximaal 100 karakters zijn',
            'any.required': 'Tenaamstelling is verplicht'
        }),

    bankNaam: Joi.string()
        .trim()
        .max(50)
        .required()
        .messages({
            'string.empty': 'Bank naam is verplicht',
            'string.max': 'Bank naam mag maximaal 50 karakters zijn',
            'any.required': 'Bank naam is verplicht'
        })
});

export const kinderrekeningArraySchema = Joi.array()
    .items(kinderrekeningIBANSchema)
    .max(10) // Max 10 kinderrekeningen (reasonable limit)
    .optional()
    .messages({
        'array.max': 'Maximaal 10 kinderrekeningen toegestaan'
    });

export const validateKinderrekeningIBAN = (data: any) => {
    return kinderrekeningIBANSchema.validate(data, { abortEarly: false });
};

export const validateKinderrekeningArray = (data: any) => {
    return kinderrekeningArraySchema.validate(data, { abortEarly: false });
};
