let _, async, mongoose, BaseController, View;
let config, axios, request, fs, crypto, countryList;
let UserModel, InviteModel, CountryModel, SpecModel,
    InsCompanyModel, InsGradeModel, InsTypeModel;


let nodemailer, ejs, transporter;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
config = require('../config/index');
countryList = require('../config/country');
crypto = require('crypto');
fs = require('fs');

UserModel = require('../models/user');
InviteModel = require('../models/invite');
CountryModel = require('../models/country'); //Nationality
SpecModel = require('../models/specialist');
InsCompanyModel = require('../models/insuranceCompany');
InsTypeModel = require('../models/insuranceType');
InsGradeModel = require('../models/insuranceGrade');

BaseController = require('./BaseController');
View = require('../views/base');

request = require('request');

nodemailer = require('nodemailer');
ejs = require('ejs');

transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.node_mail.mail_account,
        pass: config.node_mail.password
    }
});

module.exports = BaseController.extend({
    name: 'InviteController',
    list: async function (req, res) {
        let v, invites = [];
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/invite/list';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role == 'Admin') {
            invites = await InviteModel.find();
        } else {
            invites = await InviteModel.find({senderEmail: req.session.user.email});
        }
        v = new View(res, 'backend/invite/list');
        v.render({
            title: 'Invitation List',
            session: req.session,
            invites: invites,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    addUser: async function (req, res) {
        let v;
        let userType = req.query.s;
        if (userType && (userType == 'Salesman' ||
            userType == 'Company' || userType == 'Pharmacy' || userType == 'Doctor' ||
            userType == 'Driver' || userType == 'Client' || userType == 'All')) {
            if (userType == 'All') userType = 'Salesman';
            if (!this.isLogin(req)) {
                req.session.redirectTo = '/admin/invite/list';
                return res.redirect('/auth/login');
            }
            if (req.session.user.role != 'Admin') {
                return res.redirect('/*');
            }
            v = new View(res, 'backend/invite/add');
            v.render({
                title: `${userType} List`,
                session: req.session,
                user_type: userType,
                user_levels: config.userLevels,
                error: req.flash("error"),
                success: req.flash("success"),
            });
        } else {
            return res.redirect('/admin/member/add?s=All');
        }

    },
    sendInvite: async function (req, res) {
        let backurl = '/invite/list';
        if (!this.isLogin(req)) {
            req.session.redirectTo = backurl;
            return res.redirect('/auth/login');
        }
        let userInfo = req.session.user;
        let inviteToken = this.makeID('', 30);

        let isSendablePwd = true;
        //Check previous Invitation
        let prevUserInfo = await UserModel.findOne({email: req.body.email});
        if (prevUserInfo) {
            if (userInfo.role == 'Salesman' && req.body.role == 'Doctor') {
                if (prevUserInfo.inviterEmailList.indexOf(userInfo.email) > -1) {
                    console.log("--------------->", `Salesman invited doctor ${req.body.email} for several time`);
                    req.flash('error', 'You have already invited this email user!');
                    return res.redirect(backurl);
                } else { // send Invite Message
                    console.log("--------------->", `${req.body.email}  has been invited by several Salesman!!!!`);
                    isSendablePwd = false; // Has previous account
                }
            } else {
                req.flash('error', `Email User has been already registered as ${prevUserInfo.role}!`);
                return res.redirect(backurl);
            }
        }

        let password = (isSendablePwd) ? req.body.password : '';

        let prevInviteInfo = await InviteModel.findOne({senderEmail: userInfo.email, receiverEmail: req.body.email});
        if (prevInviteInfo) {
            req.flash('error', 'You have already invited this email user!');
            return res.redirect(backurl);
        }

        //Send Email Request
        let inviteURL = `${config.info.site_url}invite/accept?token=${inviteToken}`;
        ejs.renderFile("views/email/invite.ejs",
            {
                site_url: config.info.site_url,
                invite_url: inviteURL,
                site_name: config.info.site_name,
                sender_email: userInfo.email,
                receiver_email: req.body.email,
                password: password,
                sender_role: userInfo.role,
                receiver_role: req.body.role
            },
            function (err, data) {
                if (err) {
                    console.log(err);
                    req.flash('error', 'Email Sending Failed');
                    return res.redirect(backurl);
                } else {
                    let mailOptions = {
                        from: config.node_mail.mail_account, // sender address
                        to: req.body.email, // list of receivers
                        subject: '[' + config.info.site_name + '] Invitation', // Subject line
                        text: `${config.info.site_name} ✔`, // plaintext body
                        html: data // html body
                    };
                    // send mail with defined transport object
                    transporter.sendMail(mailOptions, async function (error, info) {
                        if (error) {
                            console.log(error);
                            req.flash('error', 'Email Sending Failed');
                            return res.redirect(backurl);
                        } else {
                            console.log(backurl, 'Message sent: ' + info.response);

                            await InviteModel.collection.insertOne({
                                senderEmail: userInfo.email,
                                senderRole: userInfo.role,
                                receiverEmail: req.body.email,
                                receiverRole: req.body.role,
                                password: password,
                                token: inviteToken,
                                status: 'Awaiting',
                                createdAt: new Date(),
                            });

                            req.flash('success', 'Invitation Success!');
                            return res.redirect(backurl);
                        }
                    });
                }
            });
    },

    acceptInvite: async function (req, res) {

        let inviteToken = req.query.token;
        //check token existing
        let inviteInfo = await InviteModel.findOne({token: inviteToken});
        if (!inviteInfo) { //Can't find Invitation Record
            console.log("can't find invitation record.....");
            req.flash("Invitation record has been removed");
            return res.redirect('/*');
        }

        let backURL = '/profile/info';

        if (inviteInfo.status == 'Awaiting') {
            // add / update user from users table
            let userInfo = await UserModel.findOne({email: inviteInfo.receiverEmail});
            if (userInfo) {
                //Force Login
                req.session.user = userInfo;
                req.session.login = true;
                await req.session.save();
                //Update
                if (userInfo.role != inviteInfo.receiverRole) {
                    req.flash('error', `You have been already registered as ${userInfo.role}`);
                    return res.redirect(backURL);
                }
                if (userInfo.inviterEmailList.indexOf(inviteInfo.senderEmail) > -1) {
                    req.flash('error', "You have already accepted this invitation!");
                    return res.redirect(backURL);
                }
                /// Check Doctor ..........
                userInfo.inviterEmailList.push(inviteInfo.senderEmail); //Update Inviter Email List
                await userInfo.save();

                // Update Session Information
                req.session.user = userInfo;
                await req.session.save();

                // Update Invitation Record
                inviteInfo.status = 'Accepted';
                inviteInfo.acceptedAt = new Date();
                await inviteInfo.save();

                req.flash('success', "Accept Invitation Successfully!");
                return res.redirect(backURL);
            }
            let password = crypto.createHash('md5').update(inviteInfo.password).digest("hex");
            userInfo = {
                email: inviteInfo.receiverEmail,
                password: password,
                pic: '/assets/img/user.jpg',
                role: inviteInfo.receiverRole, //admin, office

                country: 'Saudi Arabia',
                city: 'Jeddah',
                gender: 'Male',

                status: 'Enabled',
                inviterEmailList: [inviteInfo.senderEmail], //Inviter Email
                createdAt: new Date,  //Time Stamp,
                loginCount: 0,
                isDoneProfile: false,
                emailActive: 'Enabled',
                token: '',//Password Reset Token
            };
            await UserModel.collection.insertOne(userInfo);

            // Force Login
            req.session.user = userInfo;
            req.session.login = true;
            await req.session.save();
            // update Invite Record
            inviteInfo.status = 'Accepted';
            inviteInfo.acceptedAt = new Date();
            await inviteInfo.save();

            console.log(`=====> ${userInfo.email} accepted invitation from ${inviteInfo.senderEmail}`);
            req.flash('success', "Accept Invitation Successfully!");
            return res.redirect(backURL);
        } else { //Already accepted invitation
            req.flash('success', 'You have already accepted this invitation!');
            return res.redirect(backURL);
        }
    },

    acceptListInvite: async function (req, res) {
        let backurl = req.query.redirect_url;
        if (!this.isLogin(req)) {
            req.session.redirectTo = backurl;
            return res.redirect('/auth/login');
        }
        let userInfo = await UserModel.findOne({_id: req.session.user._id});
        let inviteInfo = await InviteModel.findOne({_id: req.params.id});
        if (inviteInfo.receiverRole != req.session.user.role) { //can't have different user role
            req.flash('error', "You can't have different user type!");
            return res.redirect(backurl);
        }
        let multiUserTypes = ["Doctor", "Client", "Driver"]; // These users can have several invitation
        if (multiUserTypes.indexOf(userInfo.role) < 0) {
            req.flash('error', "Your account can one invitation!");
            return res.redirect(backurl);
        }
        inviteInfo.status = 'Accepted';
        inviteInfo.acceptedAt = new Date();
        await inviteInfo.save();
        userInfo.inviterEmailList = (userInfo.inviterEmailList)?userInfo.inviterEmailList.push(inviteInfo.senderEmail):[inviteInfo.senderEmail];
        await userInfo.save();
        req.flash("success", "Accepted invitation successfully!");
        return res.redirect(backurl);
    },

    showInviteStatus: async function (req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/profile/info';
            return res.redirect('/auth/login');
        }
        let v = new View(res, 'backend/invite/info');
        if (req.session.user.isDoneProfile) {
            return res.redirect('/user/profile?m=view');
        }
        let nationalities = await CountryModel.find().sort({name:1});
        let spec_list = await SpecModel.find().sort({name:1});
        let ins_companies = await InsCompanyModel.find().sort({name:1});
        let ins_grades = await InsGradeModel.find().sort({name:1});
        let ins_types = await InsTypeModel.find().sort({name:1});
        let companies = await UserModel.find({role:'Company', status:'Enabled'}).sort({username:1});

        v.render({
            title: 'Profile Information',
            session: req.session,
            countries: countryList,
            nationalities: nationalities,
            spec_list: spec_list,
            ins_companies: ins_companies,
            ins_grades: ins_grades,
            ins_types: ins_types,
            companies: companies,
            user_info: req.session.user,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    updateInviteStatus: async function (req, res) {
        // update User Profile Information
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/profile/info';
            return res.redirect('/auth/login');
        }
        let rq = req.body;
        let userInfo = await UserModel.findOne({_id: req.session.user._id});
        rq.isDoneProfile = true;
        rq.loginCount = 1;

        userInfo = Object.assign(userInfo, rq);
        await UserModel.updateOne({_id: userInfo._id}, userInfo);

        req.session.user = userInfo;
        await req.session.save();

        req.flash('success', 'Updated Profile Information Successfully!');
        return res.redirect('/user/profile?m=edit');
    },

    deleteInvite: async function (req, res) {
        let backurl = '/invite/list';
        if (!this.isLogin(req)) {
            req.session.redirectTo = backurl;
            return res.redirect('/auth/login');
        }
        let userInfo = req.session.user;
        let inviteInfo = await InviteModel.findOne({_id: req.params.id});
        if (inviteInfo) {
            if (userInfo.role == 'Admin' || (userInfo.email == inviteInfo.senderEmail)) {
                await InviteModel.deleteOne({_id: req.params.id});
                req.flash('success', 'Invitation has been removed successfully!');
            } else {
                req.flash('error', 'Permission Denied!');
            }
            return res.redirect(backurl);
        } else {
            console.log('page not found', req.params.id);
            return res.redirect('/*');
        }
    },


});
