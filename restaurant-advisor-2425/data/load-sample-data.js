require('dotenv').config({ path: __dirname + '/../variables.env' });
const fs = require('fs');
const mongoose = require('mongoose');

// Connect to our Database and handle any bad connections
mongoose.connect(process.env.DATABASE).then(() => {
    console.log(`connection to database established`)
}).catch(err => {
    console.log(`db error ${err.message}`);
    process.exit(-1);
})

mongoose.Promise = global.Promise; // Tell Mongoose to use ES6 promises

// import all of the models
const Store = require('../models/Store');
const Review = require('../models/Review');
const User = require('../models/User');

const stores = JSON.parse(fs.readFileSync(__dirname + '/stores.json', 'utf-8'));
const reviews = JSON.parse(fs.readFileSync(__dirname + '/reviews.json', 'utf-8'));
const users = JSON.parse(fs.readFileSync(__dirname + '/users.json', 'utf8'));

async function deleteData() {
    console.log('Deleting Data');
    await Store.deleteMany();
    await Review.deleteMany();
    await User.deleteMany();
    console.log('Data Deleted. To load sample data, run\n\n\t npm run loadsample\n\n');
    process.exit();
}

async function loadData() {
    try {
        await Store.insertMany(stores);
        await Review.insertMany(reviews);
        await User.insertMany(users);
        console.log('Data Loaded');
        process.exit();
    } catch(e) {
        console.log('\n Error! The Error info is below but if you are importing sample data make sure to drop the existing database first with.\n\n\tnpm run deletesample\n\n\n');
        console.log(e);
        process.exit();
    }
}
if (process.argv.includes('--delete')) {
    deleteData();
} else {
    loadData();
}