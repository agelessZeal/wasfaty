let express, router, config;
let news_controller;

express = require('express');
router = express.Router();
config = require('../config/index');

news_controller = require('../controllers/MessageController');

router.get('/', function(req, res) {
    news_controller.listNews(req, res);
});

router.get('/contact-us', function(req, res) {
    news_controller.addNews(req, res);
});

router.get('/edit/:messageId', function(req, res) {
    news_controller.editNews(req, res);
});

router.post('/create', function(req, res){
    news_controller.createNews(req, res);
});

router.get('/delete/:messageId', function(req, res) {
   news_controller.deleteNews(req, res);
});

module.exports = router;
