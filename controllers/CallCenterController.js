let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList;

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
    name: 'CallCenterController',
    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/callcenter';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        users = await UserModel.find({role: 'CallCenter'});
        v = new View(res, 'backend/call_center/list');
        v.render({
            title: 'CallCenter List',
            session: req.session,
            countries: countryList,
            users: users
        });
    },
    add: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/callcenter/add';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        v = new View(res, 'backend/call_center/edit');
        v.render({
            title: 'CallCenter List',
            session: req.session,
            countries: countryList,
            pg_mode: false,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    edit: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let userId = req.params.userId;
        let userInfo = await UserModel.findOne({_id: userId});
        if (userInfo != null) {
            if (req.session.user.role != 'Admin' && req.session.user._id != userInfo._id) {
                return res.redirect('/*');
            }
            v = new View(res, 'backend/user/edit');
            v.render({
                title: 'Profile',
                session: req.session,
                countries: countryList,
                user_info: userInfo,
                error: req.flash("error"),
                success: req.flash("success"),
            });
        } else {
            return res.redirect('/*')
        }
    },
    addCallCenter: async function(req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/callcenter/add';
            return res.redirect('/auth/login');
        }
        let rq = req.body;
        // Check User Email Duplication
        let prevUserInfo = await UserModel.findOne({email: rq.email});
        if(prevUserInfo) {
            req.flash('error', "Email is used by someone");
            return res.redirect('/admin/callcenter/add');
        }
        rq.password = crypto.createHash('md5').update(rq.password).digest("hex");
        rq.role = 'CallCenter';
        rq.emailActive = 'Enabled';
        rq.createdAt = new Date();
        rq.isDoneProfile = true;
        rq.loginCount = 0;

        await UserModel.collection.insertOne(rq);
        console.log('added callcenter...');
        req.flash('success', 'CallCenter added successfully!');
        return res.redirect('/admin/callcenter/add');
    },
    delete: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let userId = req.params.userId;
        let userInfo = await UserModel.findOne({_id: userId});
        if (userInfo != null) {
            await userInfo.remove();
        }
        return res.redirect('/admin/callcenter');
    },

});
