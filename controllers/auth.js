const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');

const User = require('../models/user');
const CONST = require('../util/const');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: CONST.MAILER_APIKEY
    }
}));

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
        errorMessage: errMsg,
        oldInput: { email: ''},
        validationError: []
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const error = validationResult(req);
    
    if (!error.isEmpty()) {
        return res.status(422).render('auth/login', {
            pageTitle: 'Login', 
            path: '/login',
            errorMessage: error.array()[0].msg,
            oldInput: { email: email},
            validationError: error.array()
        });
    }
    User.findOne({email: email})
        .then(user => {
            if (!user) {
                return res.status(422).render('auth/login', {
                    pageTitle: 'Login', 
                    path: '/login',
                    errorMessage: 'Invalid username or password!',
                    oldInput: { email: email},
                    validationError: []
                });
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
                    return res.status(422).render('auth/login', {
                        pageTitle: 'Login', 
                        path: '/login',
                        errorMessage: 'Invalid username or password!',
                        oldInput: { email: email},
                        validationError: []
                    });
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
      errorMessage: errMsg,
      oldInput: { 
          email: '',
          password: '',
          confirmPassword: ''
      },
      validationError: []
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const error = validationResult(req);

    if (!error.isEmpty()) {
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            isAuthenticated: false,
            errorMessage: error.array()[0].msg,
            oldInput: { 
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword
            },
            validationError: error.array()
          });
    }
    bcrypt.hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email: email,
                password: hashedPassword,
                cart: { items: [] }
            })
            return user.save();
        })
        .then(() => {
            res.redirect('/login');
            return transporter.sendMail({
                to: email,
                from: 'iqbal.gartika@gmail.com',
                subject: 'Signup succeed!',
                html: '<h1>You successfully signed up on shop@nodeapp!</h1>'
            })
        })
        .catch(err => console.log(err));
};

exports.getReset = (req, res, next) => {
    let errMsg = req.flash('error');
    if (errMsg.length > 0) {
        errMsg = errMsg[0];
    } else {
        errMsg = null;
    }
    res.render('auth/reset', {
      path: '/reset',
      pageTitle: 'Reset Password',
      isAuthenticated: false,
      errorMessage: errMsg
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
            .then(user => {
                if (!user) {
                    req.flash('error', 'No user found with the email address!');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                user.save();
            })
            .then(result => {
                res.redirect('/');
                return transporter.sendMail({
                    to: req.body.email,
                    from: 'iqbal.gartika@gmail.com',
                    subject: 'Password Reset',
                    html: `
                        <p>You requested a password reset</p>
                        <p>Please click <a href="http://localhost:3000/reset/${token}">here</a> to set a new password</p>
                    `
                })
            })
            .catch(err => console.log(err));
    });
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            let errMsg = req.flash('error');
            if (errMsg.length > 0) {
                errMsg = errMsg[0];
            } else {
                errMsg = null;
            }
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                isAuthenticated: false,
                errorMessage: errMsg,
                userId: user._id.toString(),
                passwordToken: token
            });
        })
        .catch(err => console.log(err));
};

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    User.findOne({resetToken: passwordToken, resetTokenExpiration: {$gt: Date.now()}, _id: userId})
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save();
        })
        .then(() => res.redirect('/login'))
        .catch(err => console.log(err));
};
