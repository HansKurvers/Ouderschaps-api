/**
 * Email Service - SendGrid Integration
 *
 * Handles email notifications for dossier sharing.
 * Gracefully degrades if SENDGRID_API_KEY is not configured.
 */

import sgMail from '@sendgrid/mail';

export interface DossierSharedEmailParams {
    toEmail: string;
    sharedByName: string;
    sharedByEmail: string;
    dossierNummer?: string;
}

export interface DossierAccessRevokedEmailParams {
    toEmail: string;
    revokedByName: string;
    dossierNummer?: string;
}

export interface GuestInvitationEmailParams {
    toEmail: string;
    guestName?: string;
    inviterName: string;
    portalUrl: string;
    expiresAt: Date;
}

export class EmailService {
    private initialized: boolean = false;
    private fromEmail: string;
    private appUrl: string;

    constructor() {
        const apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@idocx.nl';
        this.appUrl = process.env.APP_URL || 'https://app.idocx.nl';

        if (apiKey) {
            sgMail.setApiKey(apiKey);
            this.initialized = true;
            console.log('[EmailService] Initialized with SendGrid');
        } else {
            console.warn('[EmailService] SENDGRID_API_KEY not set - emails disabled');
        }
    }

    /**
     * Send notification when a dossier is shared with someone
     * Returns true if email was sent, false if skipped or failed
     */
    async sendDossierSharedEmail(params: DossierSharedEmailParams): Promise<boolean> {
        if (!this.initialized) {
            console.log('[EmailService] Skipping email - not initialized');
            return false;
        }

        const { toEmail, sharedByName, sharedByEmail, dossierNummer } = params;

        const dossierInfo = dossierNummer ? ` (dossiernummer: ${dossierNummer})` : '';
        const sharedByInfo = sharedByEmail ? `<strong>${sharedByName}</strong> (${sharedByEmail})` : `<strong>${sharedByName}</strong>`;
        const sharedByInfoText = sharedByEmail ? `${sharedByName} (${sharedByEmail})` : sharedByName;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>i-docx</h1>
        </div>
        <div class="content">
            <h2>Een dossier is met je gedeeld</h2>
            <p>Beste gebruiker,</p>
            <p>${sharedByInfo} heeft een dossier met je gedeeld${dossierInfo}.</p>
            <p>Je kunt het dossier bekijken door in te loggen op i-docx:</p>
            <p><a href="${this.appUrl}" class="button" style="color: #ffffff;">Ga naar i-docx</a></p>
        </div>
        <div class="footer">
            <p>Met vriendelijke groet,<br>i-docx</p>
            <p>Dit is een automatisch gegenereerd bericht.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        const textContent = `
Beste gebruiker,

${sharedByInfoText} heeft een dossier met je gedeeld${dossierInfo}.

Je kunt het dossier bekijken door in te loggen op:
${this.appUrl}

Met vriendelijke groet,
i-docx
        `.trim();

        try {
            console.log(`[EmailService] Sending dossier-shared email to: ${toEmail}`);

            await sgMail.send({
                to: toEmail,
                from: {
                    email: this.fromEmail,
                    name: 'i-docx'
                },
                subject: 'Een dossier is met je gedeeld op i-docx',
                text: textContent,
                html: htmlContent
            });

            console.log(`[EmailService] Dossier-shared email sent successfully to: ${toEmail}`);
            return true;
        } catch (error) {
            console.error('[EmailService] Failed to send dossier-shared email:', error);
            return false;
        }
    }

    /**
     * Send notification when access to a dossier is revoked
     * Returns true if email was sent, false if skipped or failed
     */
    async sendDossierAccessRevokedEmail(params: DossierAccessRevokedEmailParams): Promise<boolean> {
        if (!this.initialized) {
            console.log('[EmailService] Skipping email - not initialized');
            return false;
        }

        const { toEmail, revokedByName, dossierNummer } = params;

        const dossierInfo = dossierNummer ? ` (dossiernummer: ${dossierNummer})` : '';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>i-docx</h1>
        </div>
        <div class="content">
            <h2>Toegang tot dossier ingetrokken</h2>
            <p>Beste gebruiker,</p>
            <p><strong>${revokedByName}</strong> heeft je toegang tot een dossier ingetrokken${dossierInfo}.</p>
            <p>Je hebt geen toegang meer tot dit dossier.</p>
        </div>
        <div class="footer">
            <p>Met vriendelijke groet,<br>i-docx</p>
            <p>Dit is een automatisch gegenereerd bericht.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        const textContent = `
Beste gebruiker,

${revokedByName} heeft je toegang tot een dossier ingetrokken${dossierInfo}.

Je hebt geen toegang meer tot dit dossier.

Met vriendelijke groet,
i-docx
        `.trim();

        try {
            console.log(`[EmailService] Sending access-revoked email to: ${toEmail}`);

            await sgMail.send({
                to: toEmail,
                from: {
                    email: this.fromEmail,
                    name: 'i-docx'
                },
                subject: 'Toegang tot dossier ingetrokken',
                text: textContent,
                html: htmlContent
            });

            console.log(`[EmailService] Access-revoked email sent successfully to: ${toEmail}`);
            return true;
        } catch (error) {
            console.error('[EmailService] Failed to send access-revoked email:', error);
            return false;
        }
    }

    /**
     * Send invitation email to a guest for document portal access
     * Returns true if email was sent, false if skipped or failed
     */
    async sendGuestInvitationEmail(params: GuestInvitationEmailParams): Promise<boolean> {
        if (!this.initialized) {
            console.log('[EmailService] Skipping email - not initialized');
            return false;
        }

        const { toEmail, guestName, inviterName, portalUrl, expiresAt } = params;

        const formattedDate = new Intl.DateTimeFormat('nl-NL', {
            dateStyle: 'long',
            timeStyle: 'short',
        }).format(expiresAt);

        const greeting = guestName ? `Beste ${guestName}` : 'Beste';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .expiry { background-color: #fef3c7; padding: 12px; border-radius: 6px; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>i-docx</h1>
        </div>
        <div class="content">
            <h2>U bent uitgenodigd om documenten toe te voegen</h2>
            <p>${greeting},</p>
            <p><strong>${inviterName}</strong> heeft u uitgenodigd om documenten toe te voegen aan een dossier in i-docx.</p>
            <p>Klik op onderstaande knop om naar het document portaal te gaan:</p>
            <p><a href="${portalUrl}" class="button" style="color: #ffffff;">Naar het document portaal</a></p>
            <div class="expiry">
                <strong>Let op:</strong> Deze link is geldig tot ${formattedDate}.
            </div>
        </div>
        <div class="footer">
            <p>Met vriendelijke groet,<br>i-docx</p>
            <p>Dit is een automatisch gegenereerd bericht.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        const textContent = `
${greeting},

${inviterName} heeft u uitgenodigd om documenten toe te voegen aan een dossier in i-docx.

Klik op onderstaande link om naar het document portaal te gaan:
${portalUrl}

Deze link is geldig tot ${formattedDate}.

Met vriendelijke groet,
i-docx
        `.trim();

        try {
            console.log(`[EmailService] Sending guest-invitation email to: ${toEmail}`);

            await sgMail.send({
                to: toEmail,
                from: {
                    email: this.fromEmail,
                    name: 'i-docx'
                },
                subject: 'U bent uitgenodigd om documenten toe te voegen',
                text: textContent,
                html: htmlContent
            });

            console.log(`[EmailService] Guest-invitation email sent successfully to: ${toEmail}`);
            return true;
        } catch (error) {
            console.error('[EmailService] Failed to send guest-invitation email:', error);
            return false;
        }
    }
}

/**
 * Helper function for backwards compatibility
 */
export async function sendGuestInvitationEmail(params: {
    to: string;
    guestName?: string;
    inviterName: string;
    portalUrl: string;
    expiresAt: Date;
}): Promise<boolean> {
    const emailService = new EmailService();
    return emailService.sendGuestInvitationEmail({
        toEmail: params.to,
        guestName: params.guestName,
        inviterName: params.inviterName,
        portalUrl: params.portalUrl,
        expiresAt: params.expiresAt,
    });
}
