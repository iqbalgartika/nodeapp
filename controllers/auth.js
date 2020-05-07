const bcrypt = require('bcryptjs');
const User = require('../models/user');

exports.getLogin = (req, res, next) => {
    let errMsg = req.flash('error');
    if (errMsg.length > 0) {
        errMsg = errMsg[0];
    } else {
        errMsg = null;
    }
    res.render('auth/login', {
        pageTitle: 'Login', 
        path: '/login',
        errorMessage: errMsg
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({email: email})
        .then(user => {
            if (!user) {
                req.flash('error', 'Invalid username or password!');
                return res.redirect('/login');
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.user = user;
                        req.session.isLoggedIn = true;
                        // to make sure redirect is executed after session is saved
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect('/');
                        });
                    }
                    req.flash('error', 'Invalid username or password!');
                    res.redirect('/login');
                })
                .catch(err => {
                    console.log(err);
                    return res.redirect('/login');
                });
        })
        .catch(err => console.log(err));
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        res.redirect('/');
    });
};

exports.getSignup = (req, res, next) => {
    let errMsg = req.flash('error');
    if (errMsg.length > 0) {
        errMsg = errMsg[0];
    } else {
        errMsg = null;
    }
    res.render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      isAuthenticated: false,
      errorMessage: errMsg
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    User.findOne({email: email})
        .then(userDoc => {
            if (userDoc) {
                req.flash('error', 'User already exists!');
                return res.redirect('/signup');
            }
            return bcrypt.hash(password, 12)
                .then(hashedPassword => {
                    const user = new User({
                        email: email,
                        password: hashedPassword,
                        cart: { items: [] }
                    })
                    return user.save();
                })
                .then(() => res.redirect('/login'));
        })
        .catch(err => console.log(err));
};
