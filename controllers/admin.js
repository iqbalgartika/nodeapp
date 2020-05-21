const { validationResult } = require('express-validator/check');
const mongoose = require('mongoose');

const Product = require('../models/product');
const errorHandler = require('./error').handler;

exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        product: null,
        editing: false,
        errorMessage: '',
        validationError: []
    });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;
    const price = req.body.price;
    const description = req.body.description;
    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user
    });

    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            product: product,
            editing: false,
            errorMessage: error.array()[0].msg,
            validationError: error.array()
        });
    }

    product.save()    
        .then(result => {
            console.log('Product is created');
            res.redirect('/admin/products');
        })
        .catch(err => errorHandler(err, next));
};

exports.getEditProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                res.redirect('/404');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                product: product,
                editing: true,
                errorMessage: '',
                validationError: []
            });
        })
        .catch(err => errorHandler(err, next));
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;
    const price = req.body.price;
    const description = req.body.description;
    
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            params: prodId,
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description,
                _id: prodId
            },
            editing: true,
            errorMessage: error.array()[0].msg,
            validationError: error.array()
        });
    }

    Product.findById(prodId).then(product => {
        if (product.userId.toString() !== req.user._id.toString()) {
            return res.redirect('/admin/products');
        }
        product.title = title;
        product.price = price;
        product.description = description;
        product.imageUrl = imageUrl;
        return product.save().then(result => {
            console.log('Updated product');
            res.redirect('/admin/products');
        })
    })
        .catch(err => errorHandler(err, next));
};

exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    Product.deleteOne({ _id: prodId, userId: req.user._id})
        .then(result => {
            console.log('Destroyed product');
            res.redirect('/admin/products');
        })
        .catch(err => errorHandler(err, next));
}

exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id})
        .then(product => {
            res.render('admin/products', {
                pageTitle: 'Admin Products', 
                path: '/admin/products',
                prods: product,
            });
        })
        .catch(err => errorHandler(err, next));
};