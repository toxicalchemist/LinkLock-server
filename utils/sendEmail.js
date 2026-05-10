const nodemailer = require('nodemailer');

const sendEmail = async (to, secretKey) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const vaultLink = `${frontendUrl}/v/${secretKey}`;

        const mailOptions = {
            from: `"LinkLock Secure" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: 'Secure Secret Shared with You',
            text: `Hello! Someone has sent you a secure secret on LinkLock. Because this is a private vault, you must log in with this email address to view it. View it here: ${vaultLink}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Secure Secret Shared</h2>
                    <p>Hello!</p>
                    <p>Someone has sent you a secure secret on <strong>LinkLock</strong>.</p>
                    <p>Because this is a private vault, you must log in with this email address to view it.</p>
                    <div style="margin: 30px 0;">
                        <a href="${vaultLink}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Vault</a>
                    </div>
                    <p style="font-size: 0.8em; color: #666;">If the button doesn't work, copy and paste this link: ${vaultLink}</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = sendEmail;
