const nodemailer = require('nodemailer');
const pug = require('pug');

const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT, 
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

const generateHTML = (options = {}) => {
    const html = pug.renderFile(
        `${__dirname}/../views/password-reset.pug`,
        options
    );

    return html;
};

   //exportable method to send emails
exports.send = async (options) => {
    const html = generateHTML(options);
    const mailOptions = {
        from: 'Alex <alex@alex.com>',
        to: options.user.email,
        subject: options.subject,
        html: html
    };
    
    await transport.sendMail(mailOptions);
};