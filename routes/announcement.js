let express, router, config;
let ann_controller;

express = require('express');
router = express.Router();
config = require('../config/index');

ann_controller = require('../controllers/AnnouncementController');

router.get('/', function(req, res) {
    ann_controller.listAnn(req, res);
});

router.get('/add', function(req, res) {
    ann_controller.addAnn(req, res);
});

router.get('/edit/:annId', function(req, res) {
    ann_controller.editAnn(req, res);
});

router.post('/update/:annId', function(req, res){
    ann_controller.updateAnn(req, res);
});

router.post('/create', function(req, res){
    ann_controller.createAnn(req, res);
});

router.get('/delete/:annId', function(req, res) {
    ann_controller.deleteAnn(req, res);
});

module.exports = router;
