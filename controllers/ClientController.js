let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList, OrderModel, InviteModel, ItemModel;

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
OrderModel = require('../models/order');
countryList = require('../config/country');
InviteModel = require('../models/invite');
ItemModel = require('../models/item');

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
    name: 'ClientController',
    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/client';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        users = await UserModel.find({role: 'Client'});
        v = new View(res, 'backend/client/list');
        v.render({
            title: 'Client List',
            session: req.session,
            countries: countryList,
            users: users
        });
    },
    add: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/client/add';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        v = new View(res, 'backend/invite/add');
        v.render({
            title: 'Client List',
            session: req.session,
            user_type: "Client",
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
        return res.redirect('/admin/client');
    },
    showOrders: async function (req, res) {
        let v, orders;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/orders';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Client') {
            return res.redirect('/*');
        }
        orders = await OrderModel.find({clientEmail: req.session.user.email}).sort({createdAt:-1});
        v = new View(res, 'backend/order/list');
        v.render({
            title: 'Orders',
            session: req.session,
            data_list: orders
        });
    },
    showInviteList: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/client/my-invitation';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Client') {
            return res.redirect('/*');
        }
        let invites = await InviteModel.find({receiverEmail: req.session.user.email});
        v = new View(res, 'backend/invite/doctor-list');
        v.render({
            title: 'My Invitation',
            session: req.session,
            invites:invites,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    showItems: async function (req, res) {
        let v, items;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/item';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Client') {
            return res.redirect('/*');
        }
        items = await ItemModel.find();
        v = new View(res, 'backend/master/list');
        v.render({
            title: 'Item List',
            session: req.session,
            items: items
        });
    },
});
