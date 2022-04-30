const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const short = require('short-uuid');
const Product = require('../../models/product');
const {
    productSchema
} = require('../../utils/JoiSchemas');
const catchAsync = require('../../utils/catchAsync');
const ExpressError = require('../../utils/ExpressError');
const router = express.Router();

const productValidate = (req, res, next) => {
    const {
        error
    } = productSchema.validate(req.body);

    if (error) {
        throw new ExpressError(error.message, 400);
    } else {
        next();
    }
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/temp');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}__${short.generate()}${path.extname(file.originalname)}`);
    }
})

const upload = multer({
    storage: storage
});

//  ADMIN - PRODUCT LIST
router.get('/', async (req, res) => {
    const products = await Product.find({});
    res.render('admin/product-list', {
        products
    });
});

//  ADMIN - ADD PRODUCT
router.get('/add', (req, res) => {
    res.render('admin/add-product');
})

//  ADMIN - ADD PRODUCT POST
router.post('/', upload.single('image'), productValidate, catchAsync(async (req, res) => {
    const product = new Product({
        name: req.body.name,
        image: '',
        sku: req.body.sku,
        stock: req.body.stock,
        price: req.body.price,
        details: req.body.details,
        published: req.body.publish === 'true' ? true : false
    })
    if (req.file) {
        fs.mkdirSync('./public/images/products/' + product._id);
        let newFilename = product._id + '__' + req.file.filename;
        let oldPath = './public/images/temp/' + req.file.filename;
        let newPath = './public/images/products/' + product._id + '/' + newFilename;
        fs.rename(oldPath, newPath, (err) => {
            if (err) console.log(err);
        });
        product.image = newFilename;
    }

    await product.save();
    res.redirect('/admin/products');
}));

//  ADMIN - UPDATE PRODUCT
router.get('/:id', async (req, res) => {
    const product = await Product.findOne({
        _id: req.params.id
    });
    res.render('admin/edit-product', {
        product
    })
});

//  ADMIN - UPDATE PRODUCT POST
router.put('/:id', upload.single('image'), productValidate, catchAsync(async (req, res) => {
    const product = await Product.findOne({
        _id: req.params.id
    })

    if (req.file) {
        fs.rm('./public/images/products/' + req.params.id + '/' + product.image, (err) => {
            if (err) {
                console.log(err);
            }
        });
        let newFilename = product._id + '__' + req.file.filename;
        let oldPath = './public/images/temp/' + req.file.filename;
        let newPath = './public/images/products/' + product._id + '/' + newFilename;
        fs.rename(oldPath, newPath, (err) => {
            if (err) console.log(err);
        });
        product.image = newFilename;
    }

    product.name = req.body.name;
    product.sku = req.body.sku;
    product.stock = req.body.stock;
    product.price = req.body.price;
    product.published = req.body.publish === 'true' ? true : false;
    product.isDiscounted = req.body.discountActive === 'true' ? true : false;
    product.discountAmount = req.body.discountAmount;
    product.discountedPrice = (req.body.price - (req.body.price * (req.body.discountAmount / 100))).toFixed(2);
    product.details = req.body.details;

    await product.save();
    res.redirect('/admin/products');
}))

//  ADMIN - DELETE PRODUCT
router.delete('/:id', catchAsync(async (req, res) => {
    fs.rm('./public/images/products/' + req.params.id, {
        recursive: true
    }, (err) => {
        if (err) {
            console.log(err);
        }
    });
    await Product.deleteOne({
        _id: req.params.id
    });
    res.redirect('/admin/products');
}));

module.exports = router;