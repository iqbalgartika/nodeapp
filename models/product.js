const fs = require('fs');
const path = require('path');

const p = path.join(
    path.dirname(process.mainModule.filename),
    'data',
    'products.json'
);

const getProductsFromFile = cb => {
    fs.readFile(p, (err, fileContent) => {
        if (err) {
            cb([]);
        }
        else {
            cb(JSON.parse(fileContent));
        }
    });
}

module.exports = class Product {
    constructor(id, title, imageUrl, price, description) {
        this.id = id;
        this.title = title;
        this.imageUrl = imageUrl;
        this.price = price;
        this.description = description;
    }

    save() {
        getProductsFromFile(products => {
            if(this.id) {
                const prodIdx = products.findIndex(p => p.id == this.id);
                products[prodIdx] = this;
            }
            else{
                this.id = Math.random().toString();
                products.push(this);
            }
            fs.writeFile(p, JSON.stringify(products), (err)=> {
                if(err) { console.log(err); }
            });
        });
    }

    delete() {
        getProductsFromFile(products => {
            const prods = products.filter(p => p.id != this.id);
            fs.writeFile(p, JSON.stringify(prods), (err)=> {
                if(err) { console.log(err); }
            });
        });
    }

    static fetchAll(cb) {
        getProductsFromFile(cb);
    }

    static findById(id, cb) {
        getProductsFromFile(products => {
            const prod = products.find(p => p.id === id);
            cb(prod);
        });
    }
}