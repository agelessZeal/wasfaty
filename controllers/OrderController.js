let _, async, mongoose, BaseController, transporter;
let config, axios, request, fs, ejs, crypto, nodemailer, View;
let UserModel, OrderModel, countryList, ItemModel, InviteModel;
let CountryModel, InsCompanyModel, OrderStatusModel,
    InsGradeModel, InsTypeModel, MasterItemModel;

let PdfPrinter, printer;

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
InsCompanyModel = require('../models/insuranceCompany');
InsTypeModel = require('../models/insuranceType');
InsGradeModel = require('../models/insuranceGrade');
MasterItemModel = require('../models/masterItem');
ItemModel = require('../models/item');
InviteModel = require('../models/invite');

countryList = require('../config/country');
CountryModel = require('../models/country');

BaseController = require('./BaseController');
View = require('../views/base');

PdfPrinter = require('pdfmake');

transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.node_mail.mail_account,
        pass: config.node_mail.password
    }
});

module.exports = BaseController.extend({
    name: 'CountryController',
    showOrders: async function (req, res) {
        let v, orders;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/orders';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role == 'Admin') {
            orders = await OrderModel.find({status: {$ne: 'Closed'}}).sort({createdAt: -1});
        } else {
            orders = await OrderModel.find({
                doctorEmail: req.session.user.email,
                status: {$ne: 'Closed'}
            }).sort({createdAt: -1});
        }
        v = new View(res, 'backend/order/list');
        v.render({
            title: 'Orders',
            session: req.session,
            data_list: orders
        });
    },
    showAddOrder: async function (req, res) {
        let v, clients, orderId;
        let mainCs = await MasterItemModel.find({mtType: 'main-classification'}),
            subCs = await MasterItemModel.find({mtType: 'sub-classification'}),
            brands = await MasterItemModel.find({mtType: 'brand'}),
            companies = await MasterItemModel.find({mtType: 'company-name'});

        if (!this.isLogin(req)) {
            req.session.redirectTo = '/orders/add';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }

        clients = await UserModel.find({status: 'Enabled', role: 'Client'});

        orderId = this.makeOrderId('WO', 15);


        let ins_companies = await InsCompanyModel.find().sort({name: 1});
        let ins_grades = await InsGradeModel.find().sort({name: 1});
        let ins_types = await InsTypeModel.find().sort({name: 1});

        let dosages = await MasterItemModel.find({mtType: 'dosage'});
        let items = await ItemModel.find();

        v = new View(res, 'backend/order/add');
        v.render({
            title: 'Orders',
            session: req.session,
            clients: clients,
            orderId: orderId,
            ins_companies: ins_companies,
            ins_grades: ins_grades,
            ins_types: ins_types,
            dosages: dosages,
            mainCs: mainCs,
            subCs: subCs,
            brands: brands,
            companies: companies,
            items: items,
        });
    },
    createOrder: async function (req, res) {
        let ret = {status: 'fail', data: ''}, self = this;
        if (!this.isLogin(req)) {
            ret.data = "Please login";
            return res.json(ret);
        }
        if (req.session.user.role != 'Doctor') {
            ret.data = "Permission Denied";
            return res.json(ret);
        }

        let prevClientInfo = await UserModel.findOne({email: req.body.clientEmail});
        let isExistingUser = prevClientInfo != null;

        if (isExistingUser && prevClientInfo.role != 'Client') {
            ret.data = "Client with different user level exist in website already!";
            return res.json(ret);
        }

        req.body['doctorEmail'] = req.session.user.email;
        req.body['createdBy'] = req.session.user.email;
        req.body['createdAt'] = new Date();
        req.body['status'] = 'Pending';
        req.body['orderType'] = 'Pending';

        //Update client invite email list
        let clientInfo = await UserModel.findOne({email: req.body.clientEmail});
        console.log('++++++++++++++++++++++++', clientInfo);
        if (clientInfo) {
            if (clientInfo.inviterEmailList.length > 0) {
                if (clientInfo.inviterEmailList.indexOf(req.session.user.email) < -1) {
                    clientInfo.inviterEmailList.push(req.session.user.email);
                    console.log('Updating Client Invite email list');
                    await clientInfo.save();
                }
            } else {
                clientInfo.inviterEmailList = [req.session.user.email];
                await clientInfo.save();
            }

        }

        new OrderModel(req.body).save(function (err, results) {
            if (err) {
                ret.data = "Database Error";
                return res.json(ret);
            }
            ret.status = 'success';
            ret.data = "New Order added successfully!";
            res.json(ret);

            // Send Invitation Link or Order Creation Notification
            if (isExistingUser) { // Send Order Notification
                //Send Email Request
                let orderURL = `${config.info.site_url}orders`;
                ejs.renderFile("views/email/send-message.ejs",
                    {
                        site_url: config.info.site_url,
                        order_url: orderURL,
                        site_name: config.info.site_name,
                        msg: 'You got new order',
                    },
                    function (err, data) {
                        if (err) {
                            console.log(err);
                            console.log('error', 'Email Sending Failed');
                        } else {
                            let mailOptions = {
                                from: config.node_mail.mail_account, // sender address
                                to: req.body.clientEmail, // list of receivers
                                subject: '[' + config.info.site_name + '] New Order', // Subject line
                                text: `${config.info.site_name} ✔`, // plaintext body
                                html: data // html body
                            };
                            // send mail with defined transport object
                            transporter.sendMail(mailOptions, async function (error, info) {
                                if (error) {
                                    console.log(error);
                                    req.flash('error', 'Email Sending Failed');
                                } else {
                                    console.log('Order Creation Notification Success! ========== Order Creation');
                                }
                            });
                        }
                    });
            } else { // Send Invitation Link for the Login
                //Send Email Request
                let inviteToken = self.makeID('', 30);
                let inviteURL = `${config.info.site_url}invite/accept?token=${inviteToken}`;
                ejs.renderFile("views/email/invite.ejs",
                    {
                        site_url: config.info.site_url,
                        invite_url: inviteURL,
                        site_name: config.info.site_name,
                        sender_email: req.session.user.email,
                        receiver_email: req.body.clientEmail,
                        password: config.defaultPassword,
                        sender_role: 'Doctor',
                        receiver_role: 'Client'
                    },
                    function (err, data) {
                        if (err) {
                            console.log(err);
                            console.log('error', 'Email Sending Failed');
                        } else {
                            let mailOptions = {
                                from: config.node_mail.mail_account, // sender address
                                to: req.body.clientEmail, // list of receivers
                                subject: '[' + config.info.site_name + '] Invitation', // Subject line
                                text: `${config.info.site_name} ✔`, // plaintext body
                                html: data // html body
                            };
                            // send mail with defined transport object
                            transporter.sendMail(mailOptions, async function (error, info) {
                                if (error) {
                                    console.log(error);
                                    req.flash('error', 'Email Sending Failed');
                                } else {
                                    InviteModel.collection.insertOne({
                                        senderEmail: req.session.user.email,
                                        senderRole: 'Doctor',
                                        receiverEmail: req.body.clientEmail,
                                        receiverRole: 'Client',
                                        password: config.defaultPassword,
                                        token: inviteToken,
                                        status: 'Awaiting',
                                        createdAt: new Date(),
                                    });
                                    console.log('Invitation Success! ========== Order Creation');
                                }
                            });
                        }
                    });
            }
        })
    },
    viewOrder: async function (req, res) {
        let v, orderInfo, orderId, orderStInfo, orderPhInfo;
        orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/orders/view/' + orderId;
            return res.redirect('/auth/login');
        }

        orderInfo = await OrderModel.findOne({orderId: orderId});
        orderStInfo = await OrderStatusModel.findOne({orderId: orderId}).sort({updatedAt: -1});
        // console.log('====view order status info====');
        // console.log(orderStInfo);
        // console.log('====view order info====');
        // console.log(orderInfo);

        if (orderInfo) {
            let ins_companies = await InsCompanyModel.find().sort({name: 1});
            let ins_grades = await InsGradeModel.find().sort({name: 1});
            let ins_types = await InsTypeModel.find().sort({name: 1});

            if (orderStInfo) {
                if (orderStInfo.phId) { // Pharmacy Order
                    orderPhInfo = await UserModel.findOne({_id: orderStInfo.phId});
                } else { // Driver Order
                    orderPhInfo = await UserModel.findOne({_id: orderStInfo.driverId});
                }
            }

            for (let i = 0; i < orderInfo.items.length; i++) {
                console.log(orderInfo.items[i].code, 'Current Order Items');
                let itemInfo = await ItemModel.findOne({itemId: orderInfo.items[i].code});

                orderInfo.items[i].description_en = itemInfo.description_en;
                orderInfo.items[i].description_ar = itemInfo.description_ar;
                orderInfo.items[i].picture = itemInfo.pic;
            }

            if (orderInfo.status == 'Pending' && orderInfo.orderType == 'Delivery') {
                v = new View(res, 'backend/order/delivery_view'); //delivery_view will have timer
            } else {
                v = new View(res, 'backend/order/view');
            }

            v.render({
                title: 'Orders',
                session: req.session,
                orderInfo: orderInfo,
                orderStInfo: orderStInfo,
                orderPhInfo: orderPhInfo,
                ins_companies: ins_companies,
                ins_grades: ins_grades,
                ins_types: ins_types,
            });
        } else {
            return res.redirect('/*');
        }

    },

    viewPickupOrder: async function (req, res) {
        let v, orderInfo, orderId, user_info;
        orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/orders/pickup/' + orderId;
            return res.redirect('/auth/login');
        }

        orderInfo = await OrderModel.findOne({orderId: orderId});
        console.log('====View Pickup Order====', 'viewPickupOrder');
        // console.log(pharmacyList);
        //Show Pharmacy List..

        if (orderInfo) {
            let ins_companies = await InsCompanyModel.find().sort({name: 1});
            let ins_grades = await InsGradeModel.find().sort({name: 1});
            let ins_types = await InsTypeModel.find().sort({name: 1});

            user_info = await UserModel.findOne({email: orderInfo.clientEmail});

            v = new View(res, 'backend/order/pickup');
            v.render({
                title: 'Orders',
                session: req.session,
                orderInfo: orderInfo,
                user_info: user_info,
                ins_companies: ins_companies,
                ins_grades: ins_grades,
                ins_types: ins_types,
            });
        } else {
            return res.redirect('/*');
        }
    },

    viewDeliveryOrder: async function (req, res) {
        let v, orderInfo, orderId, user_info;
        orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/orders/delivery/' + orderId;
            return res.redirect('/auth/login');
        }

        orderInfo = await OrderModel.findOne({orderId: orderId});
        console.log('====View Delivery Order====', 'viewDeliveryOrder');
        // console.log(pharmacyList);
        //Show Pharmacy List..

        if (orderInfo) {
            let ins_companies = await InsCompanyModel.find().sort({name: 1});
            let ins_grades = await InsGradeModel.find().sort({name: 1});
            let ins_types = await InsTypeModel.find().sort({name: 1});
            let drivers = await UserModel.find({role: 'Driver'}).sort({createdAt: -1});

            user_info = await UserModel.findOne({email: orderInfo.clientEmail});

            v = new View(res, 'backend/order/delivery');
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

    makeOrderId: function (prefix = "", length = 10) {
        var text = "";
        var possible = "0123456789";
        for (var i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return (prefix + text);
    },

    selectingPickUpOrder: async function (req, res) {
        let orderId = req.params.orderId;
        let phId = req.params.phId;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let phInfo = await UserModel.findOne({_id: phId});
        if (orderInfo && phInfo) {

            orderInfo.orderType = 'Pickup';
            orderInfo.status = 'Pending';
            orderInfo.updatedAt = new Date();

            await orderInfo.save();

            await OrderStatusModel({
                orderId: orderId,
                phId: phId,
                driverId: '',
                description: '',
                orderType: 'PhPicked', // PhPicked, PhAccepted, Rejected,  DriverPicked, DriverAccepted, DriverRejected,  .....
                createdAt: new Date(),
                updatedAt: new Date(),
            }).save();

            ///Send Email to pharmacy User....  consider call center part too.....

            //Send Email Request
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = `${config.info.site_url}pharmacy/orders`;
            ejs.renderFile("views/email/send-message.ejs",
                {
                    site_url: config.info.site_url,
                    order_url: orderURL,
                    site_name: config.info.site_name,
                    msg: 'You got new order.  OrderId : ' + orderInfo.orderId,
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log('error', 'Email Sending Failed');
                    } else {
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            // to: phInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + ']  Order Selected By Pharmacy', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };
                        if (callCenterInfo) {
                            mailOptions.bcc = phInfo.email + ',' + callCenterInfo.email;
                        } else {
                            mailOptions.to = phInfo.email;
                        }

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Pharmacy Selection Success! ========== Order Pharmacy Selection');
                            }
                        });
                    }
                });

            return res.redirect('/client/orders');
        } else {
            return res.redirect('/*');
        }
    },

    selectingDeliveryOrder: async function (req, res) {
        let orderId = req.params.orderId;
        let driverId = req.params.driverId;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let driverInfo = await UserModel.findOne({_id: driverId});
        if (orderInfo && driverInfo) {

            orderInfo.orderType = 'Delivery';
            orderInfo.status = 'Pending';
            orderInfo.updatedAt = new Date();

            await orderInfo.save();

            await OrderStatusModel({
                orderId: orderId,
                phId: '',
                driverId: driverId,
                description: '',
                orderType: 'DriverPicked', // PhPicked, PhAccepted, Rejected,  DriverPicked, DriverAccepted, DriverRejected,  .....
                createdAt: new Date(),
                updatedAt: new Date(),
            }).save();

            ///Send Email to pharmacy User....  consider call center part too.....
            //Send Email Request
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = `${config.info.site_url}driver/orders`;
            ejs.renderFile("views/email/send-message.ejs",
                {
                    site_url: config.info.site_url,
                    order_url: orderURL,
                    site_name: config.info.site_name,
                    msg: 'You got new order.  OrderId : ' + orderInfo.orderId,
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log('error', 'Email Sending Failed');
                    } else {
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            // to: phInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + ']  New Order', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };
                        if (callCenterInfo) {
                            mailOptions.bcc = driverInfo.email + ',' + callCenterInfo.email;
                        } else {
                            mailOptions.to = driverInfo.email;
                        }

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Driver Selection Success! ========== Order Pharmacy Selection');
                            }
                        });
                    }
                });

            return res.redirect('/client/orders');
        } else {
            return res.redirect('/*');
        }
    },

    pickingDeliveryOrder: async function (req, res) {
        let orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        if (orderInfo) {
            // Send Email to the All drivers
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let driverUsers = await UserModel.find({role: 'Driver', status: 'Enabled'});
            if (driverUsers.length == 0) {
                req.flash('error', 'There is no available drivers');
                return res.redirect('/orders/view/' + orderId);
            }
            let bccEmails = '';
            let driverEmails = [];
            for (let i = 0; i < driverUsers.length; i++) {
                driverEmails.push(driverUsers[i]);
            }
            bccEmails = driverEmails.join(',');
            if (callCenterInfo) {
                bccEmails += ',' + callCenterInfo.email;
            }
            let self = this;
            setTimeout(function () {
                self.checkingPendingOrders(orderId, callCenterInfo);
            }, config.poTs, orderId, callCenterInfo);

            orderInfo.orderType = 'Delivery';
            orderInfo.status = 'Pending';
            orderInfo.updatedAt = new Date();
            await orderInfo.save();

            // Send Notification to all drivers
            let dataFrame = {
                type: 'NEW_ORDER',
                orderId: orderInfo.orderId
            };
            console.log(orderId, '==============================');
            global.wss_driver.broadcast(JSON.stringify(dataFrame));

            if (config.isEmailAuth) {
                let orderURL = `${config.info.site_url}driver/orders`;
                ejs.renderFile("views/email/send-message.ejs",
                    {
                        site_url: config.info.site_url,
                        order_url: orderURL,
                        site_name: config.info.site_name,
                        msg: 'New Order.  OrderId : ' + orderInfo.orderId,
                    },
                    function (err, data) {
                        if (err) {
                            console.log(err);
                            req.flash('error', 'Email Sending Failed');
                            return res.redirect('/orders/view/' + orderInfo.orderId);
                        }
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            // to: phInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + ']  New Order', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };
                        mailOptions.bcc = bccEmails;
                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                                return res.redirect('/orders/view/' + orderInfo.orderId);
                            }
                            console.log('Client Delivery Selection Success! ========== Delivery Order Selection');
                            return res.redirect('/orders/view/' + orderInfo.orderId);
                        });
                    });
            }

        } else {
            res.redirect('/*');
        }
    },
    checkingPendingOrders: function (orderId, callCenterInfo) {
        console.log('checked pending orders--------------------------->>>>', orderId, callCenterInfo.email);
        OrderModel.findOne({orderId: orderId}, function (err, orderInfo) {
            if (err) {
                //Send Notification to the user
                console.log(err);
            } else {
                if (orderInfo.orderType == 'Delivery' && orderInfo.status == 'Pending') {
                    console.log('Available Pending Order');
                    // Send Message To CallCenter and Client Of this order on the Email and Notification
                    // Message Content:  still pending order,  this order will be assigned by CallCenter....
                    //Send Email Request
                    let orderURL = '';
                    for (let i = 0; i < 2; i++) {
                        if (i == 0) {
                            orderURL = `${config.info.site_url}callcenter/orders`;
                        } else {
                            orderURL = `${config.info.site_url}client/orders`;
                        }
                        ejs.renderFile("views/email/send-message.ejs",
                            {
                                site_url: config.info.site_url,
                                order_url: orderURL,
                                site_name: config.info.site_name,
                                msg: `No drivers accepted orders. OrderId : ${orderInfo.orderId}`,
                            },
                            function (rerr, data) {
                                if (rerr) {
                                    console.log(rerr);
                                    console.log('error', 'Email Sending Failed');
                                } else {
                                    let mailOptions = {
                                        from: config.node_mail.mail_account, // sender address
                                        to: callCenterInfo.email, // list of receivers
                                        subject: '[' + config.info.site_name + '] Pending Order', // Subject line
                                        text: `${config.info.site_name} ✔`, // plaintext body
                                        html: data, // html body,
                                    };
                                    if (i == 1) {
                                        mailOptions.to = orderInfo.clientEmail;
                                    }
                                    // send mail with defined transport object
                                    transporter.sendMail(mailOptions, async function (error, info) {
                                        if (error) {
                                            console.log(error);
                                            console.log('error', 'Email Pending Failed');
                                        } else {
                                            console.log(`No drivers accepted orders. OrderId : ${orderInfo.orderId}`);
                                        }
                                    });
                                }
                            });
                    }
                } else {
                    console.log('There is no pending order');
                }
                console.log('Current Order Information=====>');
                console.log(orderInfo);
            }
        })
    },
    cancelOrder: async function (req, res) {
        let orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        if (orderInfo) {
            orderInfo.status = "Cancelled";
            orderInfo.updatedAt = new Date();
            await orderInfo.save();
            return res.redirect('/client/orders'); // Consider User Levels to see order list
        } else {
            return res.redirect('/*');
        }
    },
    acceptPickupOrder: async function (req, res) {
        let orderId = req.params.orderId;
        let orderStId = req.params.orderPhId;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let orderStInfo = await OrderStatusModel.findOne({_id: orderStId, driverId: ""});

        if (orderInfo && orderStInfo) {

            orderInfo.status = "Under process";
            orderInfo.updatedAt = new Date();
            await orderInfo.save();
            orderStInfo.orderType = "PhAccepted";
            orderStInfo.updatedAt = new Date();
            await orderStInfo.save();

            //Send Email Request
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = `${config.info.site_url}client/orders`;
            ejs.renderFile("views/email/send-message.ejs",
                {
                    site_url: config.info.site_url,
                    order_url: orderURL,
                    site_name: config.info.site_name,
                    msg: 'Pharmacy accepted your order. OrderId : ' + orderInfo.orderId,
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log('error', 'Email Sending Failed');
                    } else {
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            // to: phInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + '] Accepted Order', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };
                        if (callCenterInfo) {
                            mailOptions.bcc = orderInfo.clientEmail + ',' + callCenterInfo.email;
                        } else {
                            mailOptions.to = orderInfo.clientEmail;
                        }

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Pharmacy Accept Emailing Success! ========== Order Accept');
                            }
                        });
                    }
                });

            return res.redirect('/pharmacy/orders'); // Consider User Levels to see order list
        } else {
            return res.redirect('/*');
        }
    },
    rejectPickupOrder: async function (req, res) {
        let orderId = req.params.orderId;
        let orderStId = req.params.orderPhId;
        let rejectReason = req.params.reason;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let orderStInfo = await OrderStatusModel.findOne({_id: orderStId});

        if (orderInfo && orderStInfo) {

            orderInfo.status = "Pending";
            orderInfo.updatedAt = new Date();
            await orderInfo.save();

            orderStInfo.orderType = "Rejected";
            orderStInfo.updatedAt = new Date();
            orderStInfo.description = rejectReason;
            await orderStInfo.save();

            //Send Email Request
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = `${config.info.site_url}client/orders`;
            ejs.renderFile("views/email/send-message.ejs",
                {
                    site_url: config.info.site_url,
                    order_url: orderURL,
                    site_name: config.info.site_name,
                    msg: 'Pharmacy rejected your order.  OrderId : ' + orderInfo.orderId,
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log('error', 'Email Sending Failed');
                    } else {
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            // to: phInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + '] Rejected Order', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };
                        if (callCenterInfo) {
                            mailOptions.bcc = orderInfo.clientEmail + ',' + callCenterInfo.email;
                        } else {
                            mailOptions.to = orderInfo.clientEmail;
                        }

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Pharmacy Accept Emailing Success! ========== Order Accept');
                            }
                        });
                    }
                });

            return res.redirect('/pharmacy/orders'); // Consider User Levels to see order list
        } else {
            return res.redirect('/*');
        }
    },
    closePickUpOrder: async function (req, res) {
        let orderId = req.params.orderId;
        let orderStId = req.params.orderStId;
        // let rejectReason = req.params.reason;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let orderStInfo = await OrderStatusModel.findOne({_id: orderStId});

        if (orderInfo) {

            orderInfo.status = "Closed";
            orderInfo.updatedAt = new Date();
            orderInfo.closedAt = new Date();
            await orderInfo.save();

            orderStInfo.orderType = "PhClosed";
            orderStInfo.updatedAt = new Date();
            // orderStInfo.description = rejectReason;
            await orderStInfo.save();

            //Send Email Request
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = '';
            for (let i = 0; i < 2; i++) {
                if (i == 0) {
                    orderURL = `${config.info.site_url}client/reports`;
                } else {
                    orderURL = `${config.info.site_url}callcenter/reports`;
                }
                ejs.renderFile("views/email/send-message.ejs",
                    {
                        site_url: config.info.site_url,
                        order_url: orderURL,
                        site_name: config.info.site_name,
                        msg: 'Order Closed.  OrderId : ' + orderInfo.orderId,
                    },
                    function (err, data) {
                        if (err) {
                            console.log(err);
                            console.log('error', 'Email Sending Failed');
                        } else {
                            let mailOptions = {
                                from: config.node_mail.mail_account, // sender address
                                // to: phInfo.email, // list of receivers
                                subject: '[' + config.info.site_name + '] Closed Order', // Subject line
                                text: `${config.info.site_name} ✔`, // plaintext body
                                html: data, // html body,
                            };

                            if (i == 0) {
                                mailOptions.to = orderInfo.clientEmail;
                                transporter.sendMail(mailOptions, async function (error, info) {
                                    if (error) {
                                        console.log(error);
                                        req.flash('error', 'Email Sending Failed');
                                    } else {
                                        console.log('Pharmacy Closed Emailing Success! ========== Order Closed');
                                    }
                                });
                            } else {
                                if (callCenterInfo) {
                                    mailOptions.to = callCenterInfo.email;
                                    transporter.sendMail(mailOptions, async function (error, info) {
                                        if (error) {
                                            console.log(error);
                                            req.flash('error', 'Email Sending Failed');
                                        } else {
                                            console.log('Pharmacy Closed Emailing Success! ========== Order Closed');
                                        }
                                    });
                                }

                            }
                        }
                    });
            }

            return res.redirect('/pharmacy/orders'); // Consider User Levels to see order list
        } else {
            return res.redirect('/*');
        }
    },
    acceptDeliveryOrder: async function (req, res) {
        let orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        if (orderInfo) {

            if (orderInfo.status != 'Pending') {
                req.flash('error', 'Order status has been already changed!');
                return res.redirect('/driver/orders/view/' + orderId);
            }

            orderInfo.status = "Under process";
            orderInfo.updatedAt = new Date();
            await orderInfo.save();

            await OrderStatusModel({
                orderId: orderId,
                phId: '',
                driverId: req.session.user._id,
                description: '',
                orderType: 'DriverAccepted', // PhPicked, PhAccepted, Rejected,  DriverPicked, DriverAccepted, DriverRejected,  .....
                createdAt: new Date(),
                updatedAt: new Date(),
            }).save();

            //Send Email Request
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = `${config.info.site_url}client/orders`;
            ejs.renderFile("views/email/send-message.ejs",
                {
                    site_url: config.info.site_url,
                    order_url: orderURL,
                    site_name: config.info.site_name,
                    msg: 'Driver accepted your order. OrderId : ' + orderInfo.orderId,
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log('error', 'Email Sending Failed');
                    } else {
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            // to: phInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + '] Accepted Order', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };
                        if (callCenterInfo) {
                            mailOptions.bcc = orderInfo.clientEmail + ',' + callCenterInfo.email;
                        } else {
                            mailOptions.to = orderInfo.clientEmail;
                        }

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Driver Accept Emailing Success! ========== Order Accept');
                            }
                        });
                    }
                });
            return res.redirect('/driver/orders'); // Consider User Levels to see order list
        } else {
            return res.redirect('/*');
        }
    },
    rejectDeliveryOrder: async function (req, res) {
        let orderId = req.params.orderId;
        let orderStId = req.params.orderDeliveryId;
        let rejectReason = req.params.reason;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let orderStInfo = await OrderStatusModel.findOne({_id: orderStId, phId: ""}).sort({updatedAt: -1});

        if (orderInfo && orderStInfo) {

            orderInfo.status = "Pending";
            orderInfo.updatedAt = new Date();
            await orderInfo.save();

            orderStInfo.orderType = "Rejected";
            orderStInfo.updatedAt = new Date();
            orderStInfo.description = rejectReason;
            await orderStInfo.save();
            //Send Email notification
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = `${config.info.site_url}client/orders`;
            ejs.renderFile("views/email/send-message.ejs",
                {
                    site_url: config.info.site_url,
                    order_url: orderURL,
                    site_name: config.info.site_name,
                    msg: 'Driver rejected your order.  OrderId : ' + orderInfo.orderId,
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        console.log('error', 'Email Sending Failed');
                    } else {
                        let mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            // to: phInfo.email, // list of receivers
                            subject: '[' + config.info.site_name + '] Rejected Order', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data, // html body,
                        };
                        if (callCenterInfo) {
                            mailOptions.bcc = orderInfo.clientEmail + ',' + callCenterInfo.email;
                        } else {
                            mailOptions.to = orderInfo.clientEmail;
                        }

                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Driver Accept Emailing Success! ========== Order Accept');
                            }
                        });
                    }
                });

            return res.redirect('/driver/orders'); // Consider User Levels to see order list
        } else {
            return res.redirect('/*');
        }
    },
    closeDeliveryOrder: async function (req, res) {
        let orderId = req.params.orderId;
        let orderStId = req.params.orderStId;
        // let rejectReason = req.params.reason;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let orderStInfo = await OrderStatusModel.findOne({_id: orderStId, phId: ""}).sort({updatedAt: -1});

        if (orderInfo) {

            orderInfo.status = "Closed";
            orderInfo.updatedAt = new Date();
            orderInfo.closedAt = new Date();
            await orderInfo.save();

            orderStInfo.orderType = "DriverClosed";
            orderStInfo.updatedAt = new Date();
            // orderStInfo.description = rejectReason;
            await orderStInfo.save();

            //Send Email Request
            let callCenterInfo = await UserModel.findOne({role: 'CallCenter'});
            let orderURL = '';
            for (let i = 0; i < 2; i++) {
                if (i == 0) {
                    orderURL = `${config.info.site_url}client/reports`;
                } else {
                    orderURL = `${config.info.site_url}callcenter/reports`;
                }
                ejs.renderFile("views/email/send-message.ejs",
                    {
                        site_url: config.info.site_url,
                        order_url: orderURL,
                        site_name: config.info.site_name,
                        msg: 'Order Closed.  OrderId : ' + orderInfo.orderId,
                    },
                    function (err, data) {
                        if (err) {
                            console.log(err);
                            console.log('error', 'Email Sending Failed');
                        } else {
                            let mailOptions = {
                                from: config.node_mail.mail_account, // sender address
                                // to: phInfo.email, // list of receivers
                                subject: '[' + config.info.site_name + '] Closed Order', // Subject line
                                text: `${config.info.site_name} ✔`, // plaintext body
                                html: data, // html body,
                            };
                            if (i == 0) {
                                mailOptions.to = orderInfo.clientEmail;
                                // send mail with defined transport object
                                transporter.sendMail(mailOptions, async function (error, info) {
                                    if (error) {
                                        console.log(error);
                                        req.flash('error', 'Email Sending Failed');
                                    } else {
                                        console.log('Driver Closed Emailing Success! ========== Order Closed');
                                    }
                                });
                            } else {
                                if (callCenterInfo) {
                                    mailOptions.to = callCenterInfo.email;
                                    // send mail with defined transport object
                                    transporter.sendMail(mailOptions, async function (error, info) {
                                        if (error) {
                                            console.log(error);
                                            req.flash('error', 'Email Sending Failed');
                                        } else {
                                            console.log('Driver Closed Emailing Success! ========== Order Closed');
                                        }
                                    });
                                }
                            }
                        }
                    });
            }
            return res.redirect('/driver/orders'); // Consider User Levels to see order list
        } else {
            return res.redirect('/*');
        }
    },
    printOrder: async function (req, res) {
        let ret = {status: 'fail', data: ''};
        if (!this.isLogin(req)) {
            ret.data = "Please Login!";
            return res.json(ret);
        }
        let orderId = req.body.orderId,
            clientEmail = req.body.clientEmail,
            clientMobile = req.body.clientMobile,
            clientName = req.body.clientName,
            insuranceType = req.body.clientName,
            insuranceGrade = req.body.clientName,
            insuranceCompany = req.body.clientName,
            orderRemark = req.body.clientName,
            totalPrice = req.body.totalPrice,
            items = req.body.items;

        let orderDate = '';
        let orderInfo = await OrderModel.findOne({orderId: orderId});
        let dt = new Date(new Date(orderInfo.createdAt).getTime() - config.tz);
        orderDate = this.getDate(dt);

        for (let j = 0; j < items.length; j++) {
            items[j].itemStatus = orderInfo.items[j].status;
        }

        //https://www.npmjs.com/package/pdfmake
        let fonts = {
            Roboto: {
                normal: 'public/assets/fonts/Roboto-Regular.ttf',
                bold: 'public/assets/fonts/Roboto-Medium.ttf',
                italics: 'public/assets/fonts/Roboto-Italic.ttf',
                bolditalics: 'public/assets/fonts/Roboto-MediumItalic.ttf'
            }
        };
        let styles = {
            header: {
                fontSize: 15,
                bold: true,
                margin: [0, 20, 0, 20]
            },
            subheader1: {
                fontSize: 11,
                bold: true,
                margin: [0, 5, 0, 5]
            },
            subheader2: {
                fontSize: 11,
                bold: true,
                margin: [0, 5, 0, 10]
            },
            tblHeader: {
                fontSize: 11,
                bold: true,
            },
            quote: {
                italics: true
            },
            small: {
                fontSize: 8
            }
        };

        let options = {};
        let tblHeaders = [
                {text: 'Picture', style: 'tblHeader'},
                {text: 'Item Code', style: 'tblHeader'},
                {text: 'Item Description', style: 'tblHeader'},
                {text: 'Item Dosage', style: 'tblHeader'},
                {text: 'QTY', style: 'tblHeader'},
                {text: 'Total', style: 'tblHeader'},
                {text: 'Amount', style: 'tblHeader'},
                {text: 'Status', style: 'tblHeader'}],
            widths = [80, '*', '*', '*', '*', '*', '*', '*'];

        let docDefinition = {
            pageSize: 'A3',
            pageMargins: [25, 25, 25, 35],
            pageOrientation: 'landscape',
            defaultStyle: {
                fontSize: 10,
            },
            content: [
                {text: `Wasfaty Order (${orderId})`, alignment: 'center', style: 'header'},
                {
                    alignment: 'justify',
                    columns: [
                        {
                            text: `OrderNo : ${orderId}`, style: 'subheader1',
                        },
                        {
                            text: `Insurance Type: ${insuranceType}`, style: 'subheader1'
                        }
                    ]
                },
                {
                    alignment: 'justify',
                    columns: [
                        {
                            text: `Client name : ${clientName}`, style: 'subheader1',
                        },
                        {
                            text: `Insurance Grade : ${insuranceGrade}`, style: 'subheader1',
                        }
                    ]
                },
                {
                    alignment: 'justify',
                    columns: [
                        {
                            text: `Client Mobile : ${clientMobile}`, style: 'subheader1',
                        },
                        {
                            text: `Insurance Company : ${insuranceCompany}`, style: 'subheader1',
                        }
                    ]
                },
                {
                    alignment: 'justify',
                    columns: [
                        {text: `Remarks: ${orderRemark}`, alignment: 'left', style: 'subheader2'},
                        {
                            text: `OrderDate : ${orderDate}`, style: 'subheader2',
                        }
                    ]
                },
                {
                    style: 'tableExample',
                    table: {
                        headerRows: 1,
                        widths: widths,
                        dontBreakRows: true,
                        body: [tblHeaders]
                    }
                },
                {text: `Total : $ ${totalPrice}`, alignment: 'right', style: 'subheader1'},
            ],
            styles: styles
        };

        console.log(items);

        for (let i = 0; i < items.length; i++) {
            let tblRow = [];
            tblRow.push({image: 'public' + items[i].itemImg, fit: [80, 80]});
            tblRow.push(items[i].itemCode);
            tblRow.push(items[i].itemDescription);
            tblRow.push(items[i].itemDosage);
            tblRow.push(items[i].itemQty);
            tblRow.push(items[i].itemAmount);
            tblRow.push(items[i].itemTotal);
            tblRow.push(items[i].itemStatus);
            docDefinition.content[5].table.body.push(tblRow);
        }
        let pdfPath = `public/downloads/pdf/${orderId}.pdf`;
        printer = new PdfPrinter(fonts);
        let pdfDoc = printer.createPdfKitDocument(docDefinition, options);
        pdfDoc.pipe(fs.createWriteStream(pdfPath));
        pdfDoc.on('end', function () {
            ret.data = {fp: `downloads/pdf/${orderId}.pdf`, name: `${orderId}.pdf`};
            ret.status = 'success';
            return res.json(ret);
        });
        pdfDoc.end();
    }
});
