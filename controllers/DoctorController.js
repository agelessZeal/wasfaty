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
countryList = require('../config/country');

UserModel = require('../models/user');
InviteModel = require('../models/invite');

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
    name: 'DoctorController',
    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/doctor';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        users = await UserModel.aggregate([
            {$match:{role: 'Doctor'}},
            {$lookup: {from: 'specialists', localField: 'spec', foreignField: 'specId', as: 'spec'}},
        ]);
        v = new View(res, 'backend/doctor/list');
        v.render({
            title: 'Doctor List',
            session: req.session,
            countries: countryList,
            users: users
        });
    },
    showInviteList: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/doctor/my-invitation';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        let invites = await InviteModel.find({receiverEmail: req.session.user.email});
        v = new View(res, 'backend/invite/salesman-list');
        v.render({
            title: 'My Invitation',
            session: req.session,
            invites:invites,
            error: req.flash("error"),
            success: req.flash("success"),
        });
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
        return res.redirect('/admin/doctor');
    },

});
