const mongoose = require('mongoose');
const User = mongoose.model('User');
const { body, validationResult } = require('express-validator');

exports.registerForm = (req, res) => {
    res.render('register', { title: 'Register'});
};

// Rules for express-validator
exports.validationRules = () => {
    return [
        body('name', 'A Name is required').notEmpty(),
        body('email', 'This Email is not valid')
            .isEmail()
            .normalizeEmail({
                remove_dots: false,
                remove_extension: false,
                gmail_remove_subaddress: false
        }),
        body('password', 'Password cannot be blank').notEmpty(),
    ];
};

// Custom Rules for express-validator
exports.validationCustomRules = () => {
    return body('password-confirm').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match');
        }
        return true;
    });
} 

//MIDDLEWARE function for SIGN-UP
exports.validateRegister = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        //Iterate errors and generate a flash for each one
        req.flash('error', errors.array().map(err => err.msg));
    
        res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
        return;
    }
    
    next(); //if no errors -> go to next MIDDLEWARE
};

//MIDDLEWARE function for SIGN-UP
exports.register = async (req, res, next) => {
    const user = new User({ email: req.body.email, name: req.body.name });
    await User.register(user, req.body.password);
    next(); //go to the next middleware
};

exports.account = (req, res) => {
    res.render('account', {title: 'Edit your account'});
};

exports.updateAccount = async (req, res) => {
    const updates = {
        name: req.body.name,
        email: req.body.email
    };

    const user = await User.findOneAndUpdate(
        //query: which object we want to update
        { _id: req.user._id },
        //update: object to be set on top of what already exists
        { $set: updates },
        //options --> mongoose requires context: 'query'
        { new: true, runValidators: true, context: 'query' }
    );

    req.flash('success', 'Updated the profile');

    //Going Back -> Use the referer header or fallback to /account
    const redirectTo = req.get('Referer') || '/account';
    res.redirect(redirectTo);
};