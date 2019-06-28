let _, async, mongoose, BaseController, transporter;
let config, axios, request, fs, ejs, crypto, nodemailer, View;
let UserModel, OrderModel, countryList, ItemModel, InviteModel;
let CountryModel, InsCompanyModel, InsGradeModel, InsTypeModel, MasterItemModel;

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
            req.session.redirectTo = '/client/orders';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin' && req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        if (req.session.user.role == 'Admin') {
            orders = await OrderModel.find().sort({createdAt:-1});
        } else {
            orders = await OrderModel.find({doctorEmail: req.session.user.email}).sort({createdAt:-1});
        }
        v = new View(res, 'backend/order/list');
        v.render({
            title: 'Orders',
            session: req.session,
            data_list: orders
        });
    },
    showAddOrder: async function(req, res) {
        let v, clients, orderId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/orders/add';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        clients = await UserModel.find({status:'Enabled', role:'Client'});

        orderId = this.makeOrderId('WO', 15);


        let ins_companies = await InsCompanyModel.find().sort({name:1});
        let ins_grades = await InsGradeModel.find().sort({name:1});
        let ins_types = await InsTypeModel.find().sort({name:1});

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
            items: items,
        });
    },
    createOrder: async function (req, res) {
        let ret = {status:'fail', data:''}, self = this;
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
        let v, orderInfo, orderId;
        orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/orders/view/' + orderId;
            return res.redirect('/auth/login');
        }

        orderInfo = await OrderModel.findOne({orderId: orderId});
        if (orderInfo) {
            let ins_companies = await InsCompanyModel.find().sort({name:1});
            let ins_grades = await InsGradeModel.find().sort({name:1});
            let ins_types =  await InsTypeModel.find().sort({name:1});

            v = new View(res, 'backend/order/view');
            v.render({
                title: 'Orders',
                session: req.session,
                orderInfo: orderInfo,
                ins_companies: ins_companies,
                ins_grades: ins_grades,
                ins_types: ins_types,
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
});
