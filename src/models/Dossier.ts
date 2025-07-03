import { Schema, model, Document } from 'mongoose';

export interface IDossier extends Document {
    dossierNumber: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'closed';
    createdBy: string;
    assignedTo?: string;
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
    updatedAt: Date;
}

const dossierSchema = new Schema<IDossier>(
    {
        dossierNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'closed'],
            default: 'open'
        },
        createdBy: {
            type: String,
            required: true
        },
        assignedTo: {
            type: String
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        }
    },
    {
        timestamps: true
    }
);

export const Dossier = model<IDossier>('Dossier', dossierSchema);