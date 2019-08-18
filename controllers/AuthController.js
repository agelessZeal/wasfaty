let _, async, mongoose, BaseController;
let config, axios, request, fs, crypto, ejs,
    nodemailer, transporter;
let UserModel, View;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
crypto = require('crypto');
nodemailer = require('nodemailer');
request = require('request');
config = require('../config/index');
fs = require('fs');
ejs = require('ejs');

UserModel = require('../models/user');
BaseController = require('./BaseController');
View = require('../views/base');

transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.node_mail.mail_account,
        pass: config.node_mail.password
    }
});

let d = new Date();

module.exports = BaseController.extend({
    name: 'AuthController',
    login: async function (req, res) {
        let v;
        v = new View(res, 'auth/login');
        v.render({
            title: 'Sign In',
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    register: async function (req, res) {
        let v;
        if (this.isLogin(req)) {
            return res.redirect('/');
        }
        v = new View(res, 'auth/register');
        v.render({
            title: 'Sign Up',
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),
        })
    },
    loginUser: async function (req, res) {
        if (this.isLogin(req)) {
            return res.redirect('/');
        }
        let email = req.body.email.trim();
        let password = crypto.createHash('md5').update(req.body.password).digest("hex");
        let userInfo = await UserModel.findOne({email: email, password: password});
        if (userInfo == null) {
            req.flash('error', 'Incorrect email or password.');
            return res.redirect('/auth/login');
        }
        if (userInfo.emailActive == 'Disabled') {
            console.log('Please confirm your e-mail address in your inbox before logging in');
            req.flash('error', 'Please confirm your e-mail address in your inbox before logging in');
            return res.redirect('/auth/login');
        }
        if (userInfo.status == 'Disabled') {
            req.flash('error', 'Your account has been disabled now, it should be activated by admin');
            return res.redirect('/auth/login');
        }

        //Set Login Number
        let logincnt = (userInfo.loginCount) ? userInfo.loginCount : 0;
        userInfo.loginCount = logincnt + 1;
        userInfo.ipAddress = this.getClientIp(req);
        await userInfo.save();

        req.session.login = true;
        req.session.user = userInfo;
        await req.session.save();

        if (userInfo.isDoneProfile) {
            let backURL = req.session.redirectTo || '/dashboard';
            delete req.session.redirectTo;
            return res.redirect(backURL);
        } else {
            return res.redirect('/invite/profile/info');
        }
    },
    createUser: async function (req, res) {
        //check validation
        if (this.isLogin(req)) {
            return res.redirect('/');
        }
        let password = req.body.password;
        let email = req.body.email;

        let pw_data = this.checkPasswordValidation(password);
        if (!pw_data.st) {
            req.flash('error', pw_data.msg);
            return res.redirect('/auth/register');
        }

        let prevUserByEmail = await UserModel.findOne({email: email});
        if (prevUserByEmail != null) {
            req.flash('error', 'The Email has already been taken by someone');
            return res.redirect('/auth/register');
        }

        password = crypto.createHash('md5').update(password).digest("hex");
        let token = this.makeID('');

        if (config.isEmailAuth) {
            await UserModel.collection.insertOne({
                email: email.trim(),
                password: password,
                phone: req.body.phone,
                pic: '/assets/img/user.jpg',
                country: 'Saudi Arabia',
                city: 'Jeddah',
                gender: 'Male',
                address: '',
                status: 'Enabled',
                createdAt: new Date(),
                role: req.body.role,
                token: token,
                isDoneProfile: false,
                loginCount: 0,
                emailActive: 'Enabled',
            });

            let confirmURL = `${config.info.site_url}auth/confirm_account?token=${token}`;
            ejs.renderFile("views/email/template.ejs",
                {
                    site_url: config.info.site_url,
                    confirm_url: confirmURL,
                    site_name: config.info.site_name
                },
                function (err, data) {
                    if (err) {
                        console.log(err);
                        req.flash('error', 'Email Sending Failed');
                        return res.redirect('/auth/register');
                    } else {
                        var mailOptions = {
                            from: config.node_mail.mail_account, // sender address
                            to: email, // list of receivers
                            subject: '[' + config.info.site_name + '] Registration Confirmation', // Subject line
                            text: `${config.info.site_name} ✔`, // plaintext body
                            html: data // html body
                        };
                        // send mail with defined transport object
                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                                req.flash('error', 'Email Sending Failed');
                                return res.redirect('/auth/register');
                            } else {
                                console.log('Message sent: ' + info.response);
                                console.log('[' + d.toLocaleString() + '] ' + 'Registered successfully');
                                req.flash('success', 'Registered successfully. Please Confirm your email');
                                return res.redirect('/auth/register');
                            }
                        });
                    }
                });
        } else {
            await UserModel.collection.insertOne({
                email: email.trim(),
                password: password,
                phone: req.body.phone,
                pic: '/assets/img/user.jpg',
                country: 'Saudi Arabia',
                city: 'Jeddah',
                address: '',
                status: "Enabled",
                createdAt: new Date(),
                role: req.body.role,
                token: token,
                emailActive: 'Enabled',
            });
            req.flash('success', 'Registered successfully');
            return res.redirect('/auth/login');
        }
    },

    confirmAccount: async function (req, res) {
        let token, user;
        token = req.query.token;
        if (this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        user = await UserModel.findOne({token: token});
        if (user == null) {
            req.flash('error', "Invalid Token");
            return res.redirect('/auth/register');
        } else {
            user.emailActive = 'Enabled';
            user.token = '';
            await user.save();
            req.flash('success', "Email confirmed successfully");
            return res.redirect('/auth/login');
        }
    },

    logout: async function (req, res) {
        req.session.login = false;
        req.session.user = null;
        await req.session.save();
        return res.redirect('/');
    },
    forgotPassword: async function (req, res) {
        let v;
        if (this.isLogin(req)) {
            return res.redirect('/');
        }
        v = new View(res, 'auth/forgot-password');
        v.render({
            title: 'Forgot Password',
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),
        })
    },
    // reset password
    reset_password: async function (req, res, next) {
        let email, userinfo;
        email = req.body.email;
        userinfo = await UserModel.findOne({email: email});
        if (userinfo == null) {
            req.flash('error', 'Can not find your email.');
            return res.redirect('/auth/forgot-password');
        } else {
            let token = this.makeID('WS-', 20);
            let confirmURL = config.info.site_url + 'auth/password/reset/' + token;
            userinfo.token = token;
            userinfo.save(async function (err, data) {
                if (err) {
                    console.log(err);
                } else {
                    ejs.renderFile("views/email/reset-password.ejs",
                        {
                            site_url: config.info.site_url,
                            confirm_url: confirmURL,
                            site_name: config.info.site_name
                        },
                        function (err, data) {
                            if (err) {
                                console.log(err);
                                req.flash('error', 'Please check Provider Email');
                                return res.redirect('/auth/forgot-password');
                            } else {
                                var mailOptions = {
                                    from: config.node_mail.mail_account, // sender address
                                    to: email, // list of receivers
                                    subject: '[' + config.info.site_name + '] Please reset your password', // Subject line
                                    text: `${config.info.site_name} ✔`, // plaintext body
                                    html: data // html body
                                };
                                // send mail with defined transport object
                                transporter.sendMail(mailOptions, function (error, info) {
                                    if (error) {
                                        console.log(error);
                                        req.flash('error', 'Please check Provider Email');
                                        return res.redirect('/auth/forgot-password');
                                    } else {
                                        console.log('Message sent: ' + info.response);
                                        console.log('[' + d.toLocaleString() + '] ' + email + '\'message has been sent successfully');
                                        req.flash('success', 'Check your email for a link to reset your password. If it doesn’t appear within a few minutes, check your spam folder.');
                                        return res.redirect('/auth/forgot-password');
                                    }
                                });
                            }
                        });
                }
            });

        }
    },
    show_password_change: async function (req, res, next) {
        let token, userinfo;
        token = req.params.token;
        userinfo = await UserModel.findOne({token: token});
        if (userinfo != null) {
            var v = new View(res, 'auth/change-password');
            v.render({
                token: token,
                session: req.session,
                error: req.flash("error"),
                success: req.flash("success"),
                title: 'Change Password'
            });
        } else {
            return res.redirect('/auth/login');
        }
    },

    password_change: async function (req, res, next) {
        let token, userinfo, new_pass, confirm_pass;
        token = req.body.token;
        userinfo = await UserModel.findOne({token: token});
        if (userinfo != null) {
            new_pass = req.body.new_password;
            confirm_pass = req.body.confirm_password;
            if (new_pass != confirm_pass) {
                req.flash('error', 'Confirm Password doesn\'t match!');
                return res.redirect('/auth/password/reset/' + token);
            } else if (new_pass.length < 6) {
                req.flash('error', 'Password should be at least 6 characters');
                return res.redirect('/auth/password/reset/' + token);
            } else {
                userinfo.password = crypto.createHash('md5').update(new_pass).digest("hex");
                userinfo.token = "";
                await userinfo.save();
                req.flash("success", 'New password set successfully.');
                return res.redirect('/auth/login');
            }

        } else {
            req.flash('error', 'User doesn\'t exist!');
            return res.redirect('/auth/password/reset/' + token);
        }
    },

    checkPasswordValidation: function (pwd) {
        let ret = {
            st: false,
            msg: ""
        };
        if (pwd.trim().length < config.pwd_length) {
            ret.msg = "The password must be at least 6 characters.";
            return ret;
        }
        ret.st = true;
        return ret;

    }
});
