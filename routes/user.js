let express, router, config;
let user_controller;

express = require('express');
router = express.Router();
config = require('../config/index');

user_controller = require('../controllers/UserController');
/******************************************************************
 *                  Common User Routes                           /
 *****************************************************************/
router.get('/profile', function (req, res) {
    user_controller.editProfile(req, res);
});

router.get('/delete/:userId', function (req, res) {
    user_controller.deleteUser(req, res);
});

router.post('/upload_avatar', function (req, res) {
    user_controller.uploadAvatar(req, res);
});

router.post('/update', function (req, res) {
    user_controller.updateProfile(req, res);
});

router.get('/change-password', function (req, res) {
    user_controller.changePassword(req, res);
});

router.get('/reset-password', function (req, res) {
    user_controller.resetPassword(req, res);
});

router.post('/change-password', function (req, res) {
    user_controller.updatePassword(req, res);
});

router.post('/reset-password/:userId', function (req, res) {
    user_controller.updateUserPassword(req, res);
});

module.exports = router;
