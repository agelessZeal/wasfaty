let express, router, config;
let auth_controller;

express = require('express');
router = express.Router();
config = require('../config/index');

auth_controller = require('../controllers/AuthController');
/******************************************************************
 *                  Auth Controller                               /
 ******************************************************************/

router.get('/login', function (req, res) {
    auth_controller.login(req, res);
});

router.get('/register', function (req, res) {
    auth_controller.register(req, res);
});

router.post('/login', function (req, res) {
    auth_controller.loginUser(req, res);
});

router.get('/logout', function (req, res) {
    auth_controller.logout(req, res);
});

router.post('/register', function (req, res) {
    auth_controller.createUser(req, res);
});

router.get('/forgot-password', function (req, res) {
    auth_controller.forgotPassword(req, res);
});

router.get('/confirm_account', function (req, res, next) {
    auth_controller.confirmAccount(req, res, next);
});

router.post('/reset_password', function (req, res, next) {
    auth_controller.reset_password(req, res, next);
});

router.get('/password/reset/:token', function (req, res, next) {
    auth_controller.show_password_change(req, res, next);
});

router.post('/password/reset', function (req, res, next) {
    auth_controller.password_change(req, res, next);
});

module.exports = router;
