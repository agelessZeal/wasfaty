let _, async, mongoose, BaseController, View, path;
let config, axios, request, fs, ejs;
let UserModel, countryList, MessageModel;

let nodemailer, transporter;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
path = require('path');
config = require('../config/index');
fs = require('fs');
ejs = require('ejs');
nodemailer = require('nodemailer');
countryList = require('../config/country');

UserModel = require('../models/user');
MessageModel = require('../models/message');

BaseController = require('./BaseController');
View = require('../views/base');
request = require('request');



transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.node_mail.mail_account,
        pass: config.node_mail.password
    }
});

module.exports = BaseController.extend({
    name: 'MessageController',
    listNews: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin' && req.session.user.role != 'CallCenter') {
            return res.redirect('/*');
        }
        let news_list = await MessageModel.find();
        v = new View(res, 'backend/message/index');
        v.render({
            title: 'Message',
            session: req.session,
            news_list: news_list,
            filter: req.query,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    addNews: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        v = new View(res, 'backend/message/edit');
        v.render({
            title: 'Contact Us',
            session: req.session,
            pg_type: true,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    editNews: async function (req, res) {
        let v;
        let messageId = req.params.messageId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = "/message/edit/" + messageId;
            return res.redirect('/auth/login');
        }
        let msgInfo = await MessageModel.findOne({messageId: messageId});
        if (msgInfo != null) {
            v = new View(res, 'backend/message/edit');
            v.render({
                title: 'Message',
                session: req.session,
                pg_type: false, // True => add mode, False => edit mode
                msgInfo: msgInfo,
                error: req.flash("error"),
                success: req.flash("success"),
            });
        } else {
            return res.redirect('/*')
        }
    },
     createNews: async function(req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role == 'Admin') {
            return res.redirect('/*');
        }
        let rq = req.body;
        let messageId = this.makeID('N', '5');
        await MessageModel.collection.insertOne({
            userEmail: req.session.user.email,
            userType: req.session.user.role,
            messageId: messageId,
            title: rq.title,
            description: rq.description,
            createdAt: new Date(),
        });

         let dataFrame = {
             type: "NEW_ANN",
             data: {
                 messageId: messageId,
                 title: rq.title,
                 description: rq.description,
                 userType: 'Admin',
                 createdAt: new Date(),
             }
         };
         global.wss_msg.broadcast(JSON.stringify(dataFrame));

        console.log('===================1111========================');

         // Send Message Admin
         let msgURL = `${config.info.site_url}message`;
         let adminInfo = await UserModel.findOne({role:'Admin'});
         let callcenterInfo = await UserModel.findOne({role:'CallCenter'});

         ejs.renderFile("views/email/send-notification.ejs",
             {
                 site_url: config.info.site_url,
                 msg_url: msgURL,
                 site_name: config.info.site_name,
                 msgTitle: rq.title,
                 msg: rq.description,
             },
             function (err, data) {
                 if (err) {
                     console.log(err);
                     console.log('error', 'Email Sending Failed');
                 } else {

                     let mailOptions = {
                         from: config.node_mail.mail_account, // sender address
                         subject: '[' + config.info.site_name + ']  Message From User', // Subject line
                         text: `${config.info.site_name} ✔`, // plaintext body
                         html: data, // html body,
                     };

                     if (callcenterInfo) {
                         mailOptions.bcc = `${adminInfo.email},${callcenterInfo.email}`;
                     } else {
                         mailOptions.to = `${adminInfo.email}`;
                     }

                     // send mail with defined transport object
                     transporter.sendMail(mailOptions, async function (error, info) {
                         if (error) {
                             console.log(error);
                             req.flash('error', 'Email Sending Failed');
                         } else {
                             console.log('Client Sent Contact Message Success! By Client========== Contact Us Message');
                         }
                     });
                 }
             });
        console.log('===================1111========================');
        req.flash('success', 'Your message has been sent successfully');
        return res.redirect('/message/contact-us');
    },
    deleteNews: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let messageId = req.params.messageId;
        let newsInfo = await MessageModel.findOne({_id: messageId});
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        if (newsInfo != null) {
            await newsInfo.remove();
        }
        return res.redirect('/admin/news');
    },
    uploadAttachment: async function (req, res) {
        let upload_file, fn, ext, dest_fn;
        upload_file = req.files.file;
        fn = upload_file.name;
        ext = fn.substr(fn.lastIndexOf('.') + 1).toLowerCase();
        if (ext == 'blob') ext = 'png';
        dest_fn = this.makeID('attachment_', 10) + "." + ext;
        upload_file.mv('public/uploads/attachments/' + dest_fn, async function (err) {
            if (err) {
                console.log('File Uploading Error');
                console.log(err);
                return res.send({status: 'fail', data: 'File Uploading Error'});
            }
            return res.send({status: 'success', data: {fn: fn, path: '/uploads/attachments/' + dest_fn}});
        });
    },
});
