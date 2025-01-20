const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

const userSchema = new Schema({
    email: {
        type: String,
        unique: true, //email-username -> must be unique
        lowercase: true,
        trim: true,
        required: 'Please provide an email address'
    },
    name: {
        type: String,
        required: 'Please provide a name',
        trim: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    admin: {
        type: Boolean,
        default: false
    }
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

module.exports = mongoose.model('User', userSchema);