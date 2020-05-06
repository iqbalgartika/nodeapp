const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    cart: {
        items: [
            {
                productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true}, 
                quantity: {type: Number, required: true}
            }
        ]
    },
    
});

userSchema.methods.addToCart = function(product) {
    const cartProductIdx = this.cart.items.findIndex(cp => {
        return cp.productId.toString() === product._id.toString();
    });
    if (cartProductIdx >= 0) {
        this.cart.items[cartProductIdx].quantity += 1;
    }
    else {
        this.cart.items.push({productId: product, quantity:1})
    }
    return this.save();
}

userSchema.methods.deleteCartItem = function(productId) {
    this.cart.items = this.cart.items.filter(i => {
        return i.productId.toString() !== productId;
    });
    return this.save();
}

userSchema.methods.clearCart = function() {
    this.cart = {items: []};
    return this.save();
}

module.exports = mongoose.model('User', userSchema);

// const mongodb = require('mongodb');
// const getDb = require('../util/database').getDb;

// const ObjectId = mongodb.ObjectId;

// class User {
//     constructor(username, email, cart, id) {
//         this.name = username;
//         this.email = email;
//         this.cart = cart;
//         this._id = id;
//     }

//     save() {
//         const db = getDb();
//         return db.collection('users').insertOne(this);
//     }

//     addToCart(product) {
//         const cartProductIdx = this.cart.items.findIndex(cp => {
//             return cp.productId.toString() === product._id.toString();
//         });
//         if (cartProductIdx >= 0) {
//             this.cart.items[cartProductIdx].quantity += 1;
//         }
//         else {
//             this.cart.items.push({productId: new ObjectId(product._id), quantity:1})
//         }

//         const db = getDb();
//         return db.collection('users').updateOne(
//             {_id: new ObjectId(this._id)},
//             {$set: {cart: this.cart}}
//         );
//     }

//     getCart() {
//         const db = getDb();
//         const productIds = this.cart.items.map(i => {
//             return i.productId;
//         });
//         return db.collection('products').find({_id: {$in: productIds}}).toArray()
//             .then(products => {
//                 return products.map(p => {
//                     return {
//                         ...p,
//                         quantity: this.cart.items.find(i => {
//                             return i.productId.toString() === p._id.toString();
//                         }).quantity
//                     };
//                 });
//             })
//             .catch(err => console.log(err));
//     }

//     deleteCartItem(productId) {
//         const db = getDb();
//         return db.collection('users').updateOne(
//             {_id: new ObjectId(this._id)},
//             {$set: {cart: {items: this.cart.items.filter(i => {
//                 return i.productId.toString() !== productId;
//             })}}}
//         );
//     }

//     addOrder() {
//         const db = getDb();
//         return this.getCart()
//             .then(products => {
//                 const order = {
//                     items: products,
//                     user: {
//                         _id: this._id,
//                         name: this.name
//                     }
//                 }
//                 return db.collection('orders').insertOne(order);
//             })
//             .then(() => {
//                 this.cart = {items: []};
//                 return db.collection('users').updateOne(
//                     {_id: new ObjectId(this._id)},
//                     {$set: {cart: this.cart}}
//                 );
//             })
//             .catch(err => console.log(err));
        
//     }

//     getOrders() {
//         const db = getDb();
//         return db.collection('orders').find({'user._id': new ObjectId(this._id)}).toArray();
//     }

//     static findById(userId) {
//         const db = getDb();
//         return db.collection('users').findOne({_id: new ObjectId(userId)})
//             .catch(err => console.log(err));
//     }
// }

// module.exports = User;