const multer = require('multer');
const uuid = require('uuid');
const { Jimp } = require('jimp');
const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const fetch = require('node-fetch');

//*** Verify Credentials
const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
    throw Error('You must own the store in order to edit it');
    } 
};

exports.homePage = (req, res) => {
    req.flash('error', `hola <strong>que</strong> tal`);
    req.flash('info', `hola`);
    req.flash('warning', `hola`);
    req.flash('success', `hola`);

    res.render('extendingLayout');  
};

exports.addStore = (req, res) => {
    //same template is used to create and to edit
    res.render('editStore', { title: 'Add Store' });
};


const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter: function(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) {
            next(null, true); //1st value is provided in case of error.
        } else {
            next({ message: 'That filetype isn\'t allowed'}, false);
        }
    }
};

//MIDLEWARE FUNCTION for CREATE STORE
exports.verify = multer(multerOptions).single('photo');

//MIDLEWARE FUNCTION for CREATE STORE
exports.upload = async (req, res, next) => {
    //check if there is no new file to resize
    if (!req.file) {
        next(); // no file -> do nothing and go to next middleware
        return;
    }
    console.log(req.body);
    console.log(req.file);
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    //now we resize and write in hard-drive
    const photo = await Jimp.read(req.file.buffer);
    photo.resize({ w: 800, h: Jimp.AUTO }); //width=800, height=AUTO
    await photo.write(`./public/uploads/${req.body.photo}`);
    //photo saved in file system, keep going with the PIPELINE
    next();
};

exports.createStore = async (req, res) => {
    const store = new Store(req.body);
    const savedStore = await store.save();
    console.log('Store saved!');
    req.flash('success', `Successfully Created ${store.name}.`);
    res.redirect(`/store/${savedStore.slug}`);
    //add the id of authenticated user object as author in body
    req.body.author = req.user._id; 
};

async function getGeolocationFromAddress(address) {
    const baseUrl = 'https://nominatim.openstreetmap.org/search';
    
    try {
        const response = await fetch(`${baseUrl}?q=${encodeURIComponent(address)}&format=json&addressdetails=1`);
        const data = await response.json();

        // Comprobar si la respuesta contiene datos
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon)};
        } else {
            throw new Error('No geolocation data found for the given address.');
        }
    } catch (error) {
        console.error('Error fetching geolocation:', error);
        return { lat: null, lon: null };
    }
}

exports.getStoreBySlug = async (req, res, next) => {
    try {
        // Buscar la tienda por el slug
        const store = await Store.findOne({ slug: req.params.slug });

        // Si no se encuentra la tienda, pasar al siguiente middleware
        if (!store) {
            return res.status(404).render('error', {message: 'Store not found'});
        }

        // Obtener las coordenadas de la tienda usando la función de geolocalización
        const geolocation = await getGeolocationFromAddress(store.address);

        // Si las coordenadas son válidas, pasarlas al renderizado de la vista
        res.render('store', {
            title: `Store ${store.name}`,
            store: store,
            geolocation   // pasar la geolocalización 
        });
    } catch (error) {
        res.render('store', { 
            title: `Store ${store.name}`,
            store, 
            geolocation: null, 
    })};
};

exports.getMaps = async (req, res) => {
    const stores = await Store.find();
    if (!stores || stores.length === 0) {
        return res.status(404).render('error', { message: 'Stores not found' });
    }

    const storesData = [];

    // Geocodificar las direcciones de todas las tiendas
    for (const store of stores) {
        try {
            const geolocation = await getGeolocationFromAddress(store.address);
            storesData.push({
                name: store.name,
                averageRating: store.averageRating || 0,
                geolocation: geolocation
            });
        } catch (error) {
            console.error(`Error geocodification the adress of the store ${store.name}:`, error);
            storesData.push({
                name: store.name,
                averageRating: store.averageRating || 0,
                geolocation: null 
            });
        }
    }

    // Renderizar la vista del mapa con las tiendas geocodificadas
    res.render('storesMap', { storesData });
};

exports.getStores = async (req, res) => {
    const stores = await Store.find();
    res.render('stores', {title: 'Stores', stores: stores});
};

exports.editStore = async (req, res) => {
    const store = await Store.findOne({ _id: req.params.id });
    res.render('editStore', { title: `Edit ${store.name}`, store: store});
    confirmOwner(store, req.user);
};

exports.updateStore = async (req, res) => {
    // find and update the store
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.
   body, {
        new: true, //return new store instead of old one
        runValidators: true
    }).exec();

    req.flash('success', `Successfully updated <strong>${store.name}</strong>.
    <a href="/store/${store.slug}">View store</a> `);

    res.redirect(`/stores/${store._id}/edit`);
};

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text: { //1er param: query filter -> conditions
            $search: req.query.q
    }
    }, { //2n param: query projection -> fields to include/exclude fromthe results
        score: { $meta: 'textScore' }
    }).sort({ //first filter
        score: { $meta: 'textScore' }
    }).limit(5); //second filter

    res.json({ stores, length: stores.length });
};

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true};

    //Promise1: AGGREGATE operation
    const tagsPromise = Store.getTagsList();
    
    //Promise2: find all the stores where the tag property
    //of a store includes the tag passed by (or any tag)
    const storesPromise = Store.find({ tags: tagQuery });

    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
   
    res.render('tags', { title: 'Tags', tags: tags, stores: stores, tag: tag});
};

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    res.render('topStores', { stores, title: 'Top Stores'});
};

exports.getStores = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 4; // items in each page
    const skip = (page * limit) - limit;

    const storesPromise = Store
        .find() //look for ALL
        .skip(skip) //Skip items of former pages
        .limit(limit) //Take the desired number of items
        .sort({ created: 'desc' }); //sort them

    const countPromise = Store.countDocuments();
    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    const pages = Math.ceil(count / limit);

    if (!stores.length && skip) {
        req.flash('info', `You asked for page ${page}. But that does not exist. So
        I put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }
    res.render('stores', {
        title: 'Stores', stores: stores, page: page,
        pages: pages, count: count
    });
};


