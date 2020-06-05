const fs = require('fs');
const path = require('path');
const stripe = require("stripe")(process.env.STRIPE_APIKEY);

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');
const errorHandler = require('./error').handler;

const ITEMS_PER_PAGE = 2;

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find().countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render('shop/index', {
                pageTitle: 'Shop', 
                path: '/',
                prods: products,
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)
            });
        })
        .catch(err => errorHandler(err, next));
};

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;

    Product.find().countDocuments()
        .then(numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip((page-1)*ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            res.render('shop/product-list', {
                pageTitle: 'Product List', 
                path: '/products',
                prods: products,
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1,
                lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)
            });
        })
        .catch(err => errorHandler(err, next));
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', {
                pageTitle: product.title, 
                path: '/product-detail',
                product: product
            });
        })
        .catch(err => errorHandler(err, next));;
};

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items;
            res.render('shop/cart', {
                pageTitle: 'Your Cart', 
                path: '/cart',
                products: products
            });
        })
        .catch(err => errorHandler(err, next));
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(() => res.redirect('/cart'))
        .catch(err => errorHandler(err, next));
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user.deleteCartItem(prodId)
        .then(() => res.redirect('/cart'))
        .catch(err => errorHandler(err, next));
}

exports.getCheckout = (req, res, next) => {
    let products;
    let total;
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            products = user.cart.items;
            total = 0;
            products.forEach(p => {
                total += p.quantity * p.productId.price;
            })

            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map(p => {
                    return {
                        name: p.productId.title,
                        description: p.productId.description,
                        amount: p.productId.price*100,
                        currency: 'usd',
                        quantity: p.quantity
                    }
                }),
                success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel',
            });
        })
        .then(session => {
            res.render('shop/checkout', {
                pageTitle: 'Checkout', 
                path: '/checkout',
                products: products,
                totalSum: total,
                sessionId: session.id
            });
        })
        .catch(err => errorHandler(err, next));
};

// exports.postOrder = (req, res, next) => {
exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return {quantity: i.quantity, product: {...i.productId._doc}}
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            })
            return order.save();
        })
        .then(() => req.user.clearCart())
        .then(() => res.redirect('/orders'))
        .catch(err => errorHandler(err, next));
};

exports.getOrders = (req, res, next) => {
    Order.find({"user.userId": req.user._id})
    .then(orders => {
        res.render('shop/orders', {
            pageTitle: 'Your Orders', 
            path: '/orders',
            orders: orders
        });
    })
    .catch(err => errorHandler(err, next));
};

exports.getOrder = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId)
        .then(order => {
            if (!order) {
                return next(new Error('No order found'));
            }
            if (order.user.userId.toString() !== req.user._id.toString()) {
                return next(new Error('Unauthorized'));
            }
            const invoiceName = 'invoice-' + orderId + '.pdf';
            const invoicePath = path.join('data', 'invoices', invoiceName);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
            
            const pdfDoc = new PDFDocument();
            pdfDoc.pipe(fs.createWriteStream(invoicePath));
            pdfDoc.pipe(res);

            pdfDoc.fontSize(26).text('Invoice');
            pdfDoc.text('---------------------');
            let totalPrice = 0;
            order.products.forEach(p => {
                totalPrice += p.product.price * p.quantity;
                pdfDoc.fontSize(14).text(p.product.title + ' : $' + p.product.price + ' x' + p.quantity );
            });
            pdfDoc.text('---------------------');
            pdfDoc.fontSize(18).text('Total Price: $' + totalPrice);

            pdfDoc.end();
            
            // fs.readFile(invoicePath, (err, data) => {
            //     if (err) {
            //         return next(err);
            //     }
            //     res.setHeader('Content-Type', 'application/pdf');
            //     res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
            //     res.send(data);
            // });
            // const file = fs.createReadStream(invoicePath);
            
            // file.pipe(res);
        })
        .catch(err => next(err));
}

