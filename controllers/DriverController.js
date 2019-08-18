let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList;

let OrderModel, OrderStatusModel;
let InsCompanyModel, InsTypeModel, InsGradeModel;
let ItemModel;

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

InsCompanyModel = require('../models/insuranceCompany');
InsTypeModel = require('../models/insuranceType');
InsGradeModel = require('../models/insuranceGrade');

OrderModel = require('../models/order');
OrderStatusModel = require('../models/orderStatus');

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
    name: 'DriverController',
    showDashboard: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/driver/dashboard';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Driver') {
            return res.redirect('/*');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }
        let v;
        v = new View(res, 'backend/driver/dashboard');
        v.render({
            title: 'Dashboard',
            session: req.session,
        });
    },
    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/driver';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        users = await UserModel.find({role: 'Driver'});
        v = new View(res, 'backend/driver/list');
        v.render({
            title: 'Driver List',
            session: req.session,
            countries: countryList,
            users: users
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
        return res.redirect('/admin/driver');
    },
    showMyOrders: async function(req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/driver/orders';
            return res.redirect('/auth/login');
        }
        let v, orders, orderStatusObjList = {};
        let orderIds = [];
        let orderStatusList = await OrderStatusModel.find({driverId: req.session.user._id}).sort({updatedAt:-1});

        console.log('----------------Driver showMyOrders-------------------------------------');
        //console.log(orderStatusList);
        orderStatusList.forEach(function(item) {
            if (orderIds.indexOf(item.orderId)<0) {
                orderIds.push(item.orderId);
            }
        });


        orders = await OrderModel.find({orderId: {$in: orderIds}, status:{$ne:'Closed'}});
        console.log('Show orders.............', orders.length); //This is Under Process orders...
        // Get All Pending Orders....
        let pendingOrders  = await OrderModel.find({orderType:'Delivery', status:'Pending'});


        orderStatusList.forEach(function(item) {
            let orderid = item.orderId.toString();
            if (!orderStatusObjList.hasOwnProperty(orderid)) {
                orderStatusObjList[orderid] =  item;
            }
        });

        console.log('Show order status .............', orderStatusList.length);

        for (let i = 0; i<orders.length; i ++) {
            let orderinfo = orders[i];
            if (orderStatusObjList.hasOwnProperty(orderinfo.orderId)) {
                let orderstinfo = orderStatusObjList[orderinfo.orderId];
                let orderst = orderstinfo.orderType;
                if ( orderst != 'Rejected') {
                    if (orderst == 'PhAccepted' || orderst == 'DriverAccepted') {
                        orderinfo.status = "Under process";
                    } else if (orderst == 'PhClosed' || orderst == 'DriverClosed') {
                        orderinfo.status = "Closed";
                    } else {
                        //
                    }
                } else {
                    orderinfo.orderType =  'Rejected';
                }
            } else {
                orderinfo.orderType =  'Pending';
            }
        }

        orders = pendingOrders.concat(orders);

        v = new View(res, 'backend/driver/my-orders');
        v.render({
            title: 'Orders',
            session: req.session,
            data_list: orders
        });
    },
    viewOrderDetail: async function(req, res) {
        let v, orderInfo, orderId, orderStInfo, driverInfo;
        orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/driver/orders/view/' + orderId;
            return res.redirect('/auth/login');
        }

        orderInfo = await OrderModel.findOne({orderId: orderId});
        orderStInfo = await OrderStatusModel.findOne({orderId: orderId, phId: ""}).sort({updatedAt: -1});
        console.log('====viewOrder====');
        console.log(orderStInfo);

        if (orderInfo) {
            let ins_companies = await InsCompanyModel.find().sort({name: 1});
            let ins_grades = await InsGradeModel.find().sort({name: 1});
            let ins_types = await InsTypeModel.find().sort({name: 1});

            if (orderStInfo) {
                driverInfo = await UserModel.findOne({_id: orderStInfo.driverId});
            }

            for (let i = 0; i<orderInfo.items.length; i++) {
                console.log('----------------------------------------', orderInfo.items[i].code);
                let itemInfo = await ItemModel.findOne({itemId: orderInfo.items[i].code});
                orderInfo.items[i].description_en = itemInfo.description_en;
                orderInfo.items[i].description_ar = itemInfo.description_ar;
                orderInfo.items[i].picture = itemInfo.pic;
            }

            console.log("Current Order Info==========>", orderInfo);

            v = new View(res, 'backend/driver/order-view');
            v.render({
                title: 'Orders',
                session: req.session,
                orderInfo: orderInfo,
                orderStInfo: orderStInfo,
                driverInfo: driverInfo,
                ins_companies: ins_companies,
                ins_grades: ins_grades,
                ins_types: ins_types,
            });
        } else {
            return res.redirect('/*');
        }
    },
    showMyOrderReports: async function(req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/driver/reports';
            return res.redirect('/auth/login');
        }
        let v, orders, orderStatusObjList = {};
        let orderIds = [];
        let orderStatusList = await OrderStatusModel.find({driverId: req.session.user._id}).sort({updatedAt:-1});

        console.log('----------------Driver showMyReports-------------------------------------');
        //console.log(orderStatusList);
        orderStatusList.forEach(function(item) {
            if (orderIds.indexOf(item.orderId)<0) {
                orderIds.push(item.orderId);
            }
        });
        orders = await OrderModel.find({orderId: {$in: orderIds}, status:'Closed'});
        orderStatusList.forEach(function(item) {
            let orderid = item.orderId.toString();
            if (!orderStatusObjList.hasOwnProperty(orderid)) {
                orderStatusObjList[orderid] =  item;
            }
        });

        console.log('Show orders.............', orderStatusList.length);
        for (let i = 0; i<orders.length; i ++) {
            let orderinfo = orders[i];
            if (orderStatusObjList.hasOwnProperty(orderinfo.orderId)) {
                let orderstinfo = orderStatusObjList[orderinfo.orderId];
                let orderst = orderstinfo.orderType;
                if ( orderst != 'Rejected') {
                    if (orderst == 'PhAccepted' || orderst == 'DriverAccepted') {
                        orderinfo.status = "Under process";
                    } else if (orderst == 'PhClosed' || orderst == 'DriverClosed') {
                        orderinfo.status = "Closed";
                    } else {
                        //
                    }
                } else {
                    orderinfo.orderType =  'Rejected';
                }
            } else {
                orderinfo.orderType =  'Pending';
            }
        }

        v = new View(res, 'backend/driver/my-reports');
        v.render({
            title: 'Order Reports',
            session: req.session,
            data_list: orders
        });
    },

});
