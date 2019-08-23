let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList, CountryModel, SpecModel,
    InsCompanyModel, InsGradeModel, InsTypeModel;

let geoip;

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
CountryModel = require('../models/country'); //Nationality
SpecModel = require('../models/specialist');

InsCompanyModel = require('../models/insuranceCompany');
InsTypeModel = require('../models/insuranceType');
InsGradeModel = require('../models/insuranceGrade');

geoip = require('geoip-lite');

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
    name: 'UserController',
    editProfile: async function (req, res) {
        let userInfo, v, title;
        let pgMode = req.query.m;
        if (pgMode != 'edit') pgMode = 'view';
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/users/profile?m=view';
            return res.redirect('/auth/login');
        }
        //Check UserId
        let userId = req.query.id;
        if (userId) { // Other User Profile Mode
            userInfo = await UserModel.findOne({_id: userId});
            if (!userInfo) return res.redirect('/*'); //Page Not found
        } else { //My Profile Mode
            userInfo = req.session.user;
            // Redirect user into Profile Information View where user should complete his profile.
            if(!userInfo.isDoneProfile) {
                return res.redirect('/invite/profile/info');
            }
        }
        let nationalities = await CountryModel.find().sort({name:1});
        let spec_list = await SpecModel.find().sort({name:1});
        let ins_companies = await InsCompanyModel.find().sort({name:1});
        let ins_grades = await InsGradeModel.find().sort({name:1});
        let ins_types = await InsTypeModel.find().sort({name:1});
        let companies = await UserModel.find({role:'Company', status:'Enabled'}).sort({nameEn:1});

        if(userInfo.role != req.session.user.role) {
            if(req.session.user.role != 'Admin' && pgMode == 'edit') {
                req.flash('error', 'Permission Denied!');
                pgMode = 'view'; // force change into view mode
            }
        }
        console.log('page mode 3', pgMode);
        title = (pgMode == 'view') ? 'View User Profile' : 'Edit User Profile';

        if (userInfo._id != req.session.user._id) {
            title = userInfo.role + ' List';
        }

        v = new View(res, 'backend/user/edit');
        v.render({
            title: title,
            session: req.session,
            pg_mode: pgMode,
            user_info: userInfo,
            user_levels: config.userLevels,
            countries: countryList,
            nationalities: nationalities,
            spec_list: spec_list,
            companies: companies,
            ins_companies: ins_companies,
            ins_grades: ins_grades,
            ins_types: ins_types,
            user_type: 'Salesman',
            error: req.flash("error"),
            success: req.flash("success"),
        })

    },
    updateProfile: async function (req, res) {
        let userId = req.query.uid;
        if (!this.isLogin(req)) {
            if (userId) {
                req.session.redirectTo = `/users/profile?id=${userId}m=edit`;
            } else {
                req.session.redirectTo = '/users/profile?m=edit';
            }
            return res.redirect('/auth/login');
        }
        console.log("UpdateProfile in UserController", req.body);
        if (!userId) {
            userId = req.session.user._id;
        }
        let userInfo = await UserModel.findOne({_id: userId});
        if (userInfo) {

            req.body.gpsLat = (req.body.gpsLat)?Number(req.body.gpsLat):'';
            req.body.gpsLong = (req.body.gpsLong)?Number(req.body.gpsLong):'';

            userInfo = Object.assign(userInfo, req.body);
            await userInfo.save();
            req.flash('success', 'Updated User Profile Successfully!');
            if (userId == req.session.user._id) {
                req.session.user = userInfo;
                await req.session.save();
                return res.redirect(`/users/profile?m=edit`);
            } else {
                return res.redirect(`/users/profile?id=${userId}&m=edit`);
            }
        } else {
            console.log("Can't find user profile information!");
            return res.redirect('/*');
        }
    },
    changePassword: async function (req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/users/change-password';
            return res.redirect('/auth/login');
        }
        let v;
        v = new View(res, 'backend/user/change-password');
        v.render({
            title: `Change Password`,
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    updatePassword: function (req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/users/change-password';
            return res.redirect('/auth/login');
        }
        let password = req.body.password;
        if (password.length < config.pwd_length) {
            req.flash('error', 'Password length must be at least 6 characters');
            return res.redirect('/users/change-password');
        }
        password = crypto.createHash('md5').update(password).digest("hex");
        UserModel.updateOne({_id: req.session.user._id}, {password: password}, function (err, data) {
            if (err) {
                req.flash('error', "Database Error");
                return res.redirect('/users/change-password');
            }
            req.flash('success', "Password changed successfully!");
            return res.redirect('/users/change-password');
        })
    },
    deleteUser: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let userId = req.params.userId;
        let userInfo = await UserModel.findOne({_id: userId});
        let user_role = userInfo.role;
        if (userInfo != null) {
            await userInfo.remove();
        }
        return res.redirect('/admin/' + user_role);
    },

    getUsers: async function (req, res) {
        let userType = req.params.userType,
            ret = {status:'success', data:''};

        if (!this.isLogin(req)) {
            ret.data = 'Please Login!';
            return  res.json(ret);
        }

        let users;
        if (userType == 'All') {
            users =  await UserModel.find({isDoneProfile: true, role: {$ne:'Admin'}}).sort({createdAt: -1});
        } else {
            users =  await UserModel.find({role: userType, isDoneProfile: true}).sort({createdAt: -1});
        }
        ret.status = 'success';
        ret.data = users;
        return res.json(ret);
    },

    getReportUsers: async function (req, res) {
        let userType = req.params.userType,
            ret = {status:'success', data:''};

        if (!this.isLogin(req)) {
            ret.data = 'Please Login!';
            return  res.json(ret);
        }

        let users;
        if (userType == 'All') {
            users =  await UserModel.find({isDoneProfile: true, role: {$in: ['Salesman', 'Company', 'Pharmacy', 'Doctor']}}).sort({createdAt: -1});
        } else {
            users =  await UserModel.find({role: userType, isDoneProfile: true}).sort({createdAt: -1});
        }
        ret.status = 'success';
        ret.data = users;
        return res.json(ret);
    },

    getLocation: async function (req, res) {
        let ip = this.getClientIp(req);
        let geo = geoip.lookup(ip);
        if (geo) {
            return res.json({gpsLat:geo.ll[0], gpsLong: geo.ll[1]});
        } else {
            return res.json({gpsLat: config.mapCenter.lat, gpsLong: config.mapCenter.long});
        }
    },

    uploadAvatar: async function (req, res) {
        let upload_file, fn, ext, dest_fn;
        upload_file = req.files.file;
        fn = upload_file.name;
        ext = fn.substr(fn.lastIndexOf('.') + 1).toLowerCase();
        if (ext == 'blob') ext = 'png';
        dest_fn = this.makeID('avatar_', 10) + "." + ext;
        upload_file.mv('public/uploads/avatar/' + dest_fn, async function (err) {
            if (err) {
                console.log('File Uploading Error');
                console.log(err);
                return res.send({status: 'fail', data: 'Avatar Image Uploading Error'});
            }
            return res.send({status: 'success', data: '/uploads/avatar/' + dest_fn});
        });
    },

});
