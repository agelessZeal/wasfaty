let _, async, mongoose, BaseController;
let config;
let View;

async = require("async");
mongoose = require('mongoose');
config = require('../config/index');

BaseController = require('./BaseController');
View = require('../views/base');

module.exports = BaseController.extend({
    name: 'ErrorController',
    show_404:async function(req,res) {
        let v;
        v = new View(res, 'error/404');
        v.render({
            title: 'OOps',
            session:req.session
        });
    },
});
