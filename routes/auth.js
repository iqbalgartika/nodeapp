const express = require('express');
const { check, body } = require('express-validator/check');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);
router.post('/login',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter a valid email')
            .normalizeEmail(),
        body('password', 'Please enter a password with only numbers and text with at least 5 characters') //check body only
            .isLength({min: 5})
            .isAlphanumeric()
            .trim()
    ],
    authController.postLogin);
router.post('/logout', authController.postLogout);
router.get('/signup', authController.getSignup);
router.post('/signup', 
    [
        check('email') //check all - body, header, cookie, etc
            .isEmail()
            .withMessage('Please enter a valid email') 
            .custom((value, {req}) => {
                return User.findOne({email: value}).then(user => {
                    if (user) {
                        return Promise.reject('User already exists!');
                    }
                });
            })
            .normalizeEmail(),
        body('password', 'Please enter a password with only numbers and text with at least 5 characters') //check body only
            .isLength({min: 5})
            .isAlphanumeric()
            .trim(),
        body('confirmPassword')
            .custom((value, {req}) => {
                if (value !== req.body.password) {
                    throw new Error('Password does not match!')
                }
                return true;
            })
            .trim()
    ],
    authController.postSignup);
router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);
router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);

module.exports = router