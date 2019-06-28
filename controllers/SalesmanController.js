let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, InviteModel, countryList;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
config = require('../config/index');
fs = require('fs');
crypto = require('crypto');
request = require('request');
nodemailer = require('nodemailer');
ejs = require('ejs');

UserModel = require('../models/user');
InviteModel = require('../models/invite');

countryList = require('../config/country');
BaseController = require('./BaseController');
View = require('../views/base');

let d = new Date();


transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.node_mail.mail_account,
        pass: config.node_mail.password
    }
});


module.exports = BaseController.extend({
    name: 'SalesmanController',
    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/salesman';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        users = await UserModel.find({role: 'Salesman'});
        v = new View(res, 'backend/salesman/list');
        v.render({
            title: 'Salesman List',
            session: req.session,
            users: users
        });
    },
    showDoctorList: async function (req, res){
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/salesman/doctor/list';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Salesman') {
            return res.redirect('/*');
        }
        users = await UserModel.find({role: 'Doctor','inviterEmailList':{$in:[req.session.user.email]}});
        v = new View(res, 'backend/doctor/doctor-list');
        v.render({
            title: 'Doctor List',
            session: req.session,
            users: users
        });
    },
    addInvite: async function(req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/salesman/invite/list';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Salesman') {
            return res.redirect('/*');
        }
        v = new View(res, 'backend/invite/add');
        v.render({
            title: 'Invitation List',
            session: req.session,
            user_type: 'Doctor',
            user_levels: config.userLevels,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    }
});
