
export class AlimentatieValidator {
    static validateCreateAlimentatie(data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate nettoBesteedbaarGezinsinkomen
        if (data.nettoBesteedbaarGezinsinkomen !== undefined) {
            if (typeof data.nettoBesteedbaarGezinsinkomen !== 'number' || data.nettoBesteedbaarGezinsinkomen < 0) {
                errors.push('nettoBesteedbaarGezinsinkomen must be a positive number');
            }
        }

        // Validate kostenKinderen
        if (data.kostenKinderen !== undefined) {
            if (typeof data.kostenKinderen !== 'number' || data.kostenKinderen < 0) {
                errors.push('kostenKinderen must be a positive number');
            }
        }

        // Validate bijdrageTemplateId
        if (data.bijdrageTemplateId !== undefined) {
            if (typeof data.bijdrageTemplateId !== 'number') {
                errors.push('bijdrageTemplateId must be a number');
            }
        }

        return { valid: errors.length === 0, errors };
    }

    static validateUpdateAlimentatie(data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate nettoBesteedbaarGezinsinkomen
        if (data.nettoBesteedbaarGezinsinkomen !== undefined) {
            if (typeof data.nettoBesteedbaarGezinsinkomen !== 'number' || data.nettoBesteedbaarGezinsinkomen < 0) {
                errors.push('nettoBesteedbaarGezinsinkomen must be a positive number');
            }
        }

        // Validate kostenKinderen
        if (data.kostenKinderen !== undefined) {
            if (typeof data.kostenKinderen !== 'number' || data.kostenKinderen < 0) {
                errors.push('kostenKinderen must be a positive number');
            }
        }

        // Validate bijdrageTemplateId
        if (data.bijdrageTemplateId !== undefined) {
            if (typeof data.bijdrageTemplateId !== 'number') {
                errors.push('bijdrageTemplateId must be a number');
            }
        }

        return { valid: errors.length === 0, errors };
    }

    static validateBijdrageKostenKinderen(data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check required fields
        if (!data.personenId || typeof data.personenId !== 'number') {
            errors.push('personenId is required and must be a number');
        }

        return { valid: errors.length === 0, errors };
    }

    static validateFinancieleAfsprakenKinderen(data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check required fields
        if (!data.kindId || typeof data.kindId !== 'number') {
            errors.push('kindId is required and must be a number');
        }

        return { valid: errors.length === 0, errors };
    }

}