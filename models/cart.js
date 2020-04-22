const fs = require('fs');
const path = require('path');

const p = path.join(
    path.dirname(process.mainModule.filename),
    'data',
    'cart.json'
);

module.exports = class Cart {
    static addProduct(id, price) {
        fs.readFile(p, (err, data) => {
            let cart = { products: [], totalPrice: 0 };
            if (!err) {
                cart = JSON.parse(data);
            }
            const prod = cart.products.find(p => p.id === id);
            if (!prod) {
                cart.products.push({ id: id, qty: 1});
            }
            else {
                prod.qty++;
            }
            cart.totalPrice += +price;
            fs.writeFile(p, JSON.stringify(cart), (err) => {
                if (err) { console.log(err); }
            })
        });
    }

    static deleteProduct(id, price) {
        fs.readFile(p, (err, data) => {
            if (err) {
                return;
            }
            const cart = JSON.parse(data);
            const prod = cart.products.find(p => p.id === id);
            if(prod) {
                cart.products = cart.products.filter(p => p.id !== id);
                cart.totalPrice -= (prod.qty*price);
                fs.writeFile(p, JSON.stringify(cart), (err) => {
                    if (err) { console.log(err); }
                })
            }
        });
    }

    static getCart(cb) {
        fs.readFile(p, (err, data) => {
            const cart = JSON.parse(data);
            if (err) {
                cb(null);
            }
            else {
                cb(cart);
            }
        });
    }
}