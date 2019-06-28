let _, async, mongoose, BaseController, View;
let config, axios, request, fs;
let UserModel;

let nodemailer, ejs, transporter;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
config = require('../config/index');
fs = require('fs');

UserModel = require('../models/user');
BaseController = require('./BaseController');
View = require('../views/base');

request = require('request');

nodemailer = require('nodemailer');
ejs = require('ejs');

transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.node_mail.mail_account,
        pass: config.node_mail.password
    }
});

module.exports = BaseController.extend({
    name: 'DashboardController',
    index: async function (req,  res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/dashboard';
            return res.redirect('/auth/login');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/profile/info');
        }
        let v;
        v = new View(res, 'backend/dashboard/index');
        v.render({
            title: 'Dashboard',
            session: req.session,
        });
    },
});
