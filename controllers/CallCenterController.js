let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList;
let OrderModel,OrderStatusModel,ItemModel,
    InsCompanyModel, InsTypeModel, InsGradeModel;


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

OrderModel = require('../models/order');
OrderStatusModel = require('../models/orderStatus');
InsCompanyModel = require('../models/insuranceCompany');
InsTypeModel = require('../models/insuranceType');
InsGradeModel = require('../models/insuranceGrade');
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
    name: 'CallCenterController',
    showDashboard: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/callcenter/dashboard';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'CallCenter') {
            return res.redirect('/*');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }
        let v;
        v = new View(res, 'backend/dashboard/index');

        let doctorsCount = await UserModel.countDocuments({role:'Doctor', isDoneProfile: true});
        let companyCount = await UserModel.countDocuments({role:'Company', isDoneProfile: true});
        let pharmacyCount = await UserModel.countDocuments({role:'Pharmacy', isDoneProfile: true});
        let ordersCount = await OrderModel.countDocuments({status:'Closed'});

        let clients = await UserModel.find({role:'Client', isDoneProfile: true});


        let dt = new Date();
        dt.setMonth(0)
        dt.setDate(0);
        dt.setUTCHours(0,0,0,0);
        let closedOrders = await OrderModel.find({status:'Closed', closedAt: {$gte: dt}});

        let closedOrderGraphData = await this.getClosedOrderGraphData(closedOrders);
        let clientGraphData = await this.clientGraphData(clients);

        let doctors = await UserModel.find({role:'Doctor', isDoneProfile: true}).sort({createdAt: -1});

        dt = new Date(); // Today Clients
        dt.setDate(dt.getDate() - 3);
        dt.setUTCHours(0,0,0,0); // Today time

        let newClients = await UserModel.find({role:'Client', createdAt: {$gte: dt}}).sort({createdAt : -1});
        // let newClients = await UserModel.find({role:'Client'}).sort({createdAt : -1});

        v.render({
            title: 'Dashboard',
            session: req.session,
            doctorsCount: doctorsCount,
            companyCount: companyCount,
            pharmacyCount: pharmacyCount,
            ordersCount: ordersCount,
            commGraphData: closedOrderGraphData,
            clientGraphData: clientGraphData,
            doctors: doctors,
            newClients: newClients,
        });
    },
    getClosedOrderGraphData: async function (closedOrders) {
        let graphData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //Total 12 Month
        let i;
        for (i = 0; i < closedOrders.length; i++) {
            let month = new Date(closedOrders[i].closedAt).getMonth();
            graphData[month]++;
        }
        return graphData;
    },
    clientGraphData: async function (clients) {
        let graphData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //Total 12 Month
        let i;
        for (i = 0; i < clients.length; i++) {
            let month = new Date(clients[i].createdAt).getMonth();
            graphData[month]++;
        }
        return graphData;
    },
    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/callcenter';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
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
        if (req.session.user.role != 'Admin') {
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
    addCallCenter: async function (req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/callcenter/add';
            return res.redirect('/auth/login');
        }
        let rq = req.body;
        // Check User Email Duplication
        let prevUserInfo = await UserModel.findOne({email: rq.email});
        if (prevUserInfo) {
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
    showOrders: async function (req, res) {
        let v, orders;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/callcenter/orders';
            return res.redirect('/auth/login');
        }
        orders = await OrderModel.find({status: {$ne:'Closed'}}).sort({createdAt: -1});
        v = new View(res, 'backend/call_center/order_list');
        v.render({
            title: 'Orders',
            session: req.session,
            data_list: orders
        });
    },
    viewDeliveryOrder: async function(req, res) {
        let v, orderInfo, orderId, user_info;
        orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/callcenter/orders/delivery/view/' + orderId;
            return res.redirect('/auth/login');
        }
        orderInfo = await OrderModel.findOne({orderId: orderId});
        console.log('====View Delivery Order====', 'viewDeliveryOrder');
        if (orderInfo) {
            let ins_companies = await InsCompanyModel.find().sort({name: 1});
            let ins_grades = await InsGradeModel.find().sort({name: 1});
            let ins_types = await InsTypeModel.find().sort({name: 1});
            let drivers = await UserModel.find({role: 'Driver'}).sort({createdAt: -1});
            user_info = await UserModel.findOne({email: orderInfo.clientEmail}); // Client Info
            v = new View(res, 'backend/call_center/view_delivery');
            v.render({
                title: 'Orders',
                session: req.session,
                orderInfo: orderInfo,
                user_info: user_info,
                ins_companies: ins_companies,
                ins_grades: ins_grades,
                ins_types: ins_types,
                drivers: drivers
            });
        } else {
            return res.redirect('/*');
        }
    },
    selectedDeliveryOrder: async function(req, res) {
        let orderId = req.params.orderId;
        let driverId = req.params.driverId;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let driverInfo = await UserModel.findOne({_id: driverId});

        console.log(orderId, driverId, 'selectedDeliveryOrder In CallCenter');

        if (orderInfo && driverInfo) {

            if (orderInfo.status != 'Pending') {
                req.flash('error', 'Order is not available to be assigned to this driver');
                return res.redirect('/callcenter/orders');
            }

            orderInfo.orderType = 'Delivery';
            orderInfo.status = 'Under process';
            orderInfo.updatedAt = new Date();

            await orderInfo.save();

            await OrderStatusModel({
                orderId: orderId,
                phId: '',
                driverId: driverId,
                description: '',
                orderType: 'DriverAccepted', // PhPicked, PhAccepted, Rejected,  DriverPicked, DriverAccepted, DriverRejected,  .....
                createdAt: new Date(),
                updatedAt: new Date(),
            }).save();
            //Send Email Request
            let orderURL = `${config.info.site_url}driver/orders`;
            ejs.renderFile("views/email/send-message.ejs",
                {
                    site_url: config.info.site_url,
                    order_url: orderURL,
                    site_name: config.info.site_name,
                    msg: 'CallCenter assigned new order to you.  OrderId : ' + orderInfo.orderId,
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log('error', 'Email Sending Failed');
                    } else {
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            to: driverInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + ']  Order Selected By CallCenter', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };
                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Driver Selection Success! By CallCenter========== Delivery Selection');
                            }
                        });
                    }
                });
            return res.redirect('/callcenter/orders');
        } else {
            return res.redirect('/*');
        }
    },
    checkPendingDeliveryOrders: async function () {
        // Checking Pending Delivery Orders
        let tsPeriod = 900 * 1000; //milliseconds, => 15 mins;
        let curTs = new Date(new Date().getTime() - tsPeriod);
        let orders = await OrderModel.find({
            orderType: 'Delivery',
            status: 'Pending',
            createdAt: {$lte: curTs}
        }).sort({createdAt: -1});
        for (let i = 0; i < orders.length; i++) {
            // Send Message to Call Center.....
            // Send Email Request
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = `${config.info.site_url}callcenter/orders`;
            ejs.renderFile("views/email/send-message.ejs",
                {
                    site_url: config.info.site_url,
                    order_url: orderURL,
                    site_name: config.info.site_name,
                    msg: 'Time exceed delivery order. OrderId : ' + orders[i].orderId,
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log('error', 'Email Sending Failed');
                    } else {
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            to: callCenterInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + '] Accepted Order', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Call Center Accept Emailing Success! ========== Time Exceed Orders');
                            }
                        });
                    }
                });
        }
    }
});
