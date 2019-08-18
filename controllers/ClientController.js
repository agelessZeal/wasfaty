let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList, OrderModel, OrderStatusModel, InviteModel, ItemModel;

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
OrderStatusModel = require('../models/orderStatus');
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
    showDashboard: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/client/dashboard';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Client') {
            return res.redirect('/*');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }
        let v;
        v = new View(res, 'backend/client/dashboard');
        v.render({
            title: 'Dashboard',
            session: req.session,
        });
    },
    showMyDoctors: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/client/doctors';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Client') {
            return res.redirect('/*');
        }
        let users = await UserModel.find({email: {$in: req.session.user.inviterEmailList}, role:'Doctor'}).sort({createdAt:-1});
        v = new View(res, 'backend/client/doctor-list');
        v.render({
            title: 'Doctor List',
            session: req.session,
            users: users,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
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
        let v, orders, orderStatusList, orderStatusObjList = {};
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/client/orders';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Client') {
            return res.redirect('/*');
        }
        orders = await OrderModel.find({clientEmail: req.session.user.email, status: {$ne:'Closed'}}).sort({createdAt:-1});
        orderStatusList = await OrderStatusModel.find().sort({createdAt: -1});

        orderStatusList.forEach(function(item) {
            let orderid = item.orderId.toString();
            if (!orderStatusObjList.hasOwnProperty(orderid)) {
                orderStatusObjList[orderid] =  item;
            }
        });

        console.log('Show orders.............', orderStatusObjList.length);

        for (let i = 0; i<orders.length; i ++) {
            let orderinfo = orders[i];
            if (orderStatusObjList.hasOwnProperty(orderinfo.orderId)) {
                let orderstinfo = orderStatusObjList[orderinfo.orderId];
                let orderst = orderstinfo.orderType;
                if ( orderst != 'Rejected') {
                    if (orderst == 'PhAccepted' || orderst == 'DriverAccepted') {
                        orderinfo.status = "Under process";
                    }
                } else {
                    orderinfo.orderType =  'Rejected';
                }
            } else {
                orderinfo.orderType =  'Pending';
            }
        }

        v = new View(res, 'backend/order/list');
        v.render({
            title: 'Orders',
            session: req.session,
            data_list: orders,
            orderStatusObjList: orderStatusObjList
        });
    },

    showOrderReports: async function (req, res) {
        let v, reports;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/client/reports';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Client') {
            return res.redirect('/*');
        }
        reports = await OrderModel.find({clientEmail: req.session.user.email, status: 'Closed'}).sort({createdAt:-1});
        console.log('Show Client Closed Orders.............');
        v = new View(res, 'backend/client/my-report');
        v.render({
            title: 'Order Reports',
            session: req.session,
            data_list: reports,
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
