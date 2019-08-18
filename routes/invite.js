let express, router, config;
let invite_controller;

express = require('express');
router = express.Router();
config = require('../config/index');

invite_controller = require('../controllers/InviteController');

/******************************************************************
 *                  Invite Router                                  /
 ******************************************************************/
router.get('/list', function (req, res) {
    invite_controller.list(req, res);
});

router.get('/accept', function (req, res) {
    invite_controller.acceptInvite(req, res);
});

router.get('/list/accept/:id', function (req, res) {
    invite_controller.acceptListInvite(req, res);
});

router.get('/profile/info', function (req, res) {
    invite_controller.showInviteStatus(req, res);
});

router.post('/profile/update', function (req, res) {
    invite_controller.updateInviteStatus(req, res);
});

router.post('/add', function (req, res) {
    invite_controller.sendInvite(req, res);
});

router.get('/delete/:id', function (req, res) {
    invite_controller.deleteInvite(req, res);
});

module.exports = router;
