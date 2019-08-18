let _, async, mongoose, BaseController, View, path;
let config, axios, request, fs, ejs, transporter, nodemailer;
let UserModel, countryList, AnnModel;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
path = require('path');
config = require('../config/index');
nodemailer = require('nodemailer');
fs = require('fs');
ejs = require('ejs');

countryList = require('../config/country');

UserModel = require('../models/user');
AnnModel = require('../models/ann');

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
    name: 'AnnouncementController',
    listAnn: async function (req, res) {
        let v, ann_list;
        if (!this.isLogin(req)) {
            req.session.redirectTo = "/announcement";
            return res.redirect('/auth/login');
        }
        if (req.session.user.role == 'Admin' || req.session.user.role == 'CallCenter') {
            ann_list = await AnnModel.find().sort({createdAt: -1});
        } else {
            ann_list = await AnnModel.find({userType: [req.session.user.role, '']}).sort({createdAt: -1});
        }
        v = new View(res, 'backend/announcement/index');
        v.render({
            title: 'Announcements',
            session: req.session,
            news_list: ann_list,
            filter: req.query,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    addAnn: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = "/announcement/add";
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        v = new View(res, 'backend/announcement/edit');
        v.render({
            title: 'Announcements',
            session: req.session,
            pg_type: true,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    editAnn: async function (req, res) {
        let v, annInfo;
        let annId = req.params.annId;

        if (!this.isLogin(req)) {
            req.session.redirectTo = "/announcement/edit/" + annId;
            return res.redirect('/auth/login');
        }
        annInfo = await AnnModel.findOne({annId: annId});
        console.log(annInfo);
        if (annInfo) {
            v = new View(res, 'backend/announcement/edit');
            v.render({
                title: 'Announcements',
                session: req.session,
                pg_type: false, // True => add mode, False => edit mode
                annInfo: annInfo,
                error: req.flash("error"),
                success: req.flash("success"),
            });
        } else {
            return res.redirect('/*')
        }
    },
    updateAnn: async function (req, res) {
        let annId = req.params.annId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = "/announcement/edit/" + annId;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let rq = req.body;
        if (!rq.title) {
            req.flash('error', 'Empty title');
            return res.redirect("/announcement/edit/" + annId);
        }
        let annInfo = await AnnModel.findOne({annId: annId});
        if (annInfo) {
            annInfo.title = rq.title;
            annInfo.description = rq.description;
            annInfo.userType = rq.userType;
            await annInfo.save();
            req.flash('success', 'Announcement updated successfully');
            return res.redirect("/announcement/edit/" + annId);
        } else {
            return res.redirect('/*');
        }
    },
    createAnn: async function (req, res) {
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let annId = this.makeID('A', '10');
        let rq = req.body;
        await AnnModel.collection.insertOne({
            annId: annId,
            title: rq.title,
            description: rq.description,
            userType: rq.userType,
            createdAt: new Date(),
        });
        // Send Notification

        let dataFrame = {
            type: "NEW_ANN",
            data: {
                annId: annId,
                title: rq.title,
                description: rq.description,
                userType: rq.userType,
                createdAt: new Date(),
            }
        };
        global.wss_msg.broadcast(JSON.stringify(dataFrame));

        // Send Message Admin
        let msgURL = `${config.info.site_url}announcement`;
        let userList = [], bccStr = '', emailList = [];
        if (rq.userType) {
            userList = await UserModel.find({role: rq.userType});
        } else {
            userList = await UserModel.find({role: {$ne: 'Admin'}});
        }

        if (config.isEmailAuth) {
            for (let i = 0; i < userList.length; i++) {
                emailList.push(userList[i].email);
            }

            bccStr = emailList.join(',');
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
                        mailOptions.bcc = bccStr;
                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, async function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                            } else {
                                console.log('Admin Sent announcement to users Success! By Admin========== Announcement Message');
                            }
                        });
                    }
                });

        }

        req.flash('success', 'Announcement record added successfully');
        res.redirect("/announcement");
    },
    deleteAnn: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let annId = req.params.annId;
        let newsInfo = await AnnModel.findOne({annId: annId});
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        if (newsInfo != null) {
            await newsInfo.remove();
        }
        req.flash('success', 'Announcement removed successfully');
        return res.redirect("/announcement");
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
