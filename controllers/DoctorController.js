let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, InviteModel, countryList, OrderModel;

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
OrderModel = require('../models/order');

BaseController = require('./BaseController');
View = require('../views/base');

transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.node_mail.mail_account,
        pass: config.node_mail.password
    }
});


module.exports = BaseController.extend({
    name: 'DoctorController',
    showDashboard: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/doctor/dashboard';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }
        let v;
        v = new View(res, 'backend/doctor/dashboard');
        v.render({
            title: 'Dashboard',
            session: req.session,
        });
    },
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
    showClients: async function(req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/doctor/clients';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        let clients = await UserModel.find({inviterEmailList: req.session.user.email});
        v = new View(res, 'backend/doctor/client-list');
        v.render({
            title: 'Clients',
            session: req.session,
            clients:clients,
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
    showMyOrderReports: async function (req, res) {
        let v, orders;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/doctor/reports';
            return res.redirect('/auth/login');
        }
        orders = await OrderModel.find({doctorEmail: req.session.user.email, status: 'Closed'}).sort({createdAt: -1});
        v = new View(res, 'backend/doctor/my-report');
        v.render({
            title: 'Order Reports',
            session: req.session,
            data_list: orders
        });
    }
});
