const nodemailer = require('nodemailer');

const sendVaultInvite = async (recipientEmail, senderEmail, vaultId) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const vaultLink = `${frontendUrl}/view/${vaultId}`;

        const mailOptions = {
            from: `"LinkLock Secure" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `New Private Secret from ${senderEmail}`,
            text: `You have a new private secret from ${senderEmail}. Access it here: ${vaultLink}. Note: You must login with this email to view it.`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Secure Secret Shared</h2>
                    <p>You have a new private secret from <strong>${senderEmail}</strong>.</p>
                    <div style="margin: 30px 0;">
                        <a href="${vaultLink}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Open Vault</a>
                    </div>
                    <p>Note: You must login with this email to view it.</p>
                    <p style="font-size: 0.8em; color: #666;">If the button doesn't work, copy and paste this link: ${vaultLink}</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${recipientEmail}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = { sendVaultInvite };
