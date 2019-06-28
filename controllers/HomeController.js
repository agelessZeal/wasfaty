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
    name: 'HomeController',
    index: async function (req,  res) {
        await this.config();///Make Demo Database...
        let v;
        v = new View(res, 'frontend/home/index');
        v.render({
            title: 'Home',
            session: req.session,
        });
    },

    config: async function () {
        ///Add Admin
        let adminInfo = await UserModel.findOne({role: 'Admin'});
        if (adminInfo == null) {
            adminInfo = new UserModel({
                "username": "admin",
                "email": "admin@gmail.com",
                "password": "02a05c6e278d3e19afaca4f3f7cf47d9", /// Password is "qqqqqqq"
                "createdAt": new Date("2019-04-25T16:08:51.667Z"),
                "role": "Admin",
                "emailActive": 'Enabled',
                "isDoneProfile": true,
                "loginCount": 0,
                "token": "",
            });
            await adminInfo.save();
        }
    }
});
