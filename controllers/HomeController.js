let _, async, mongoose, BaseController, View;
let config, axios, request, fs;
let UserModel, MasterItemModel, ProductModel;
let SettingModel;
let FavProductModel;

let nodemailer, ejs, transporter;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
config = require('../config/index');
fs = require('fs');

UserModel = require('../models/user');
SettingModel = require('../models/setting');
MasterItemModel = require('../models/masterItem');
ProductModel = require('../models/item');
FavProductModel = require('../models/favitem');

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
    name: 'HomeController',
    index: async function (req, res) {
        await this.config();///Make Demo Database...
        let v;
        v = new View(res, 'frontend/home/index');
        v.render({
            title: 'Home',
            session: req.session,
        });
    },
    showTerms: async function (req, res) {
        await this.config();///Make Demo Database...
        let v;
        v = new View(res, 'frontend/home/terms');
        v.render({
            title: 'Terms',
            session: req.session,
        });
    },
    showContactUs: async function (req, res) {
        await this.config();///Make Demo Database...
        let v;
        v = new View(res, 'frontend/home/contact-us');
        v.render({
            title: 'Contact Us',
            session: req.session,
            error: req.flash('error'),
            success: req.flash('success')
        });
    },
    sendContactUsDetails: async function(req, res) {
        let email = req.body.email.trim();
        let contactDetails = req.body.contactDetail.trim();
        if (!contactDetails) {
            req.flash('error','Error');
            return res.redirect('/contact-us');
        }
        ejs.renderFile("views/email/send-contact.ejs",
            {
                site_url: config.info.site_url,
                msgTitle: 'Contact Message',
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                userEmail: email,
                userPhone: req.body.phone,
                msg: contactDetails,
            },
            function (err, data) {
                if (err) {
                    console.log(err);
                    req.flash('error', 'Email Sending Failed');
                    return res.redirect('/contact-us');
                } else {
                    var mailOptions = {
                        from: config.node_mail.mail_account, // sender address
                        to: config.contactEmail, // list of receivers
                        subject: '[' + config.info.site_name + '] Contact Message', // Subject line
                        text: `${config.info.site_name} ✔`, // plaintext body
                        html: data // html body
                    };
                    // send mail with defined transport object
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.log(error);
                            req.flash('error', 'Email Sending Failed');
                            return res.redirect('/contact-us');
                        } else {
                            console.log('Message sent: ' + info.response);
                            req.flash('success', 'Sent your message to the service owner!');
                            return res.redirect('/contact-us');
                        }
                    });
                }
            });
    },
    showProducts: async function (req, res) {
        let v;
        v = new View(res, 'frontend/home/product');
        let mainCs = await MasterItemModel.find({mtType: 'main-classification'}),
            subCs = await MasterItemModel.find({mtType: 'sub-classification'}),
            brands = await MasterItemModel.find({mtType: 'brand'}),
            //companies = await MasterItemModel.find({mtType: 'company-name'})
            companies = await UserModel.find({role:'Company'}).sort({createdAt:-1});

        let cpyId = (req.query.cpyId)? req.query.cpyId:'';

        v.render({
            title: 'Product',
            mainCs: mainCs,
            subCs: subCs,
            brands: brands,
            cpyId: cpyId,
            companies: companies,
            session: req.session,
        });
    },

    searchProducts: async function (req, res) {
        let page, companyIds, brandIds, subIds,
            mainIds, fromPrice = 0, toPrice = Infinity,
            barcode, keyword, query = {}, pgOptions = {},
            ret = {status:'fail', data:''};

        page = (req.body.page)? req.body.page : 1 ;
        companyIds = (req.body.companyIds)? req.body.companyIds: [];
        brandIds = (req.body.brandIds)? req.body.brandIds:[];
        subIds = (req.body.subIds)? req.body.subIds:[];
        mainIds = (req.body.mainIds)? req.body.mainIds: [];

        fromPrice = (req.body.fromPrice)? req.body.fromPrice : 0;
        toPrice = (req.body.toPrice)? req.body.toPrice : Infinity;

        keyword = (req.body.q)? req.body.q: '';
        barcode = (req.body.barcode)? req.body.barcode: '';

        pgOptions = {page: page, limit: 20, sort: {createdAt: -1}};

        if (companyIds.length > 0)  query.cpyNameId = {$in: companyIds};
        if (brandIds.length > 0)  query.brandId = {$in: brandIds};
        if (subIds.length > 0)  query.subClassId = {$in: subIds};
        if (mainIds.length > 0)  query.mainClassId = {$in: mainIds};

        query.price = {$gte: Number(fromPrice), $lte: toPrice};

        if (barcode) {
            query.barcode = {$regex: `.*${barcode}.*`, '$options': 'i'};
        }

        if (keyword) {
            query.$or = [{name_en: {$regex: `.*${keyword}.*`, '$options': 'i'}}, {name_ar: {$regex: `.*${keyword}.*`, '$options': 'i'}}];
        }

        ProductModel.paginate(query, pgOptions, function (err, result) {
            if (err) {
                ret.data = "Database Error";
            } else {
                ret.status = 'success';
                ret.data = result;
            }
            res.json(ret);
        });
    },

    searchFavProducts: async function (req, res) {
        let page, companyIds, brandIds, subIds,
            mainIds, fromPrice = 0, toPrice = Infinity,
            barcode, keyword, query = {}, pgOptions = {},
            ret = {status:'fail', data:''};

        page = (req.body.page)? req.body.page : 1 ;
        companyIds = (req.body.companyIds)? req.body.companyIds: [];
        brandIds = (req.body.brandIds)? req.body.brandIds:[];
        subIds = (req.body.subIds)? req.body.subIds:[];
        mainIds = (req.body.mainIds)? req.body.mainIds: [];

        fromPrice = (req.body.fromPrice)? req.body.fromPrice : 0;
        toPrice = (req.body.toPrice)? req.body.toPrice : Infinity;

        keyword = (req.body.q)? req.body.q: '';
        barcode = (req.body.barcode)? req.body.barcode: '';

        pgOptions = {page: page, limit: 20, sort: {createdAt: -1}};

        if (companyIds.length > 0)  query.cpyNameId = {$in: companyIds};
        if (brandIds.length > 0)  query.brandId = {$in: brandIds};
        if (subIds.length > 0)  query.subClassId = {$in: subIds};
        if (mainIds.length > 0)  query.mainClassId = {$in: mainIds};

        query.price = {$gte: Number(fromPrice), $lte: toPrice};

        if (barcode) {
            query.barcode = {$regex: `.*${barcode}.*`, '$options': 'i'};
        }

        if (keyword) {
            query.$or = [{name_en: {$regex: `.*${keyword}.*`, '$options': 'i'}}, {name_ar: {$regex: `.*${keyword}.*`, '$options': 'i'}}];
        }

        if (!this.isLogin(req)) {
            res.data = 'Please Login!';
            return res.json(ret);
        }

        let favItems = await FavProductModel.find({createdBy: req.session.user._id.toString()});
        let favIds = favItems.map((favitem) => favitem.itemId);
        query.itemId = {$in: favIds};

        ProductModel.paginate(query, pgOptions, function (err, result) {
            if (err) {
                ret.data = "Database Error";
            } else {
                ret.status = 'success';
                ret.data = result;
            }
            res.json(ret);
        });

    },

    addFavProduct: async function(req, res) {
        let ret = {status:'fail', data:''};
        let itemId = req.body.itemId;

        if (!this.isLogin(req)) {
            ret.data = 'Please login!';
            return res.json(ret);
        }

        let itemInfo = await ProductModel.findOne({itemId: itemId});
        if (itemInfo) {
            ret.status = 'success';
            ret.data = 'success';
            let prevItemInfo = await FavProductModel.findOne({createdBy: req.session.user._id, itemId: itemId});
            if (!prevItemInfo) {
                await FavProductModel({
                    itemId: itemId,
                    createdBy: req.session.user._id.toString(),
                    createdAt: new Date()
                }).save();
            } else {
                console.log("Fav Item added already!.....");
            }
        } else {
            ret.data = "Invalid Item!";
        }
        return res.json(ret);
    },

    config: async function () {
        ///Add Admin
        let adminInfo = await UserModel.findOne({role: 'Admin'});
        if (adminInfo == null) {
            adminInfo = new UserModel({
                "username": "admin",
                "email": "admin@gmail.com",
                "password": "02a05c6e278d3e19afaca4f3f7cf47d9", /// Password is "qqqqqqq"
                "createdAt": new Date("2019-04-25T16:08:51.667Z"),
                "role": "Admin",
                "emailActive": 'Enabled',
                "isDoneProfile": true,
                "loginCount": 0,
                "token": "",
            });
            await adminInfo.save();
        }
        // Add default salesman and company
        let dCompany = await UserModel.findOne({role:'Company', isDefault: true});
        if (!dCompany) {
            dCompany = new UserModel({
                "email" : "company@wasfaty.com",
                "password" : "c4ca4238a0b923820dcc509a6f75849b", //Password 1
                "phone" : "1234567890",
                "pic" : "/uploads/avatar/avatar_2UNlqpFMDB.png",
                "country" : "Saudi Arabia",
                "city" : "Jeddah",
                "address" : "",
                "status" : "Enabled",
                "createdAt" : new Date(),
                "role" : "Company",
                "token" : "",
                "emailActive" : "Enabled",
                "inviterEmailList" : [],
                "ipAddress" : "127.0.0.1",
                "loginCount" : 21,
                "birthDay" : "",
                "companyName" : "",
                "gender" : "Male",
                "gps" : "34",
                "nameAr" : "Wasfaty Company",
                "nameEn" : "Wasfaty Company",
                "nationality" : "Jordan",
                "gpsLat" : 21.4858,
                "gpsLong" : 39.1915,
                "isDoneProfile" : true,
                "isDefault": true,
                "commissions" : config.defaultCommissions.Company
            });
            dCompany = await dCompany.save();
        }
        let dSalesman = await UserModel.findOne({role:'Salesman', isDefault: true});
        if (!dSalesman) {
            dSalesman = new UserModel({
                "email" : "salesman@wasfaty.com",
                "password" : "c4ca4238a0b923820dcc509a6f75849b",
                "phone" : "1234567890",
                "pic" : "/assets/img/user.jpg",
                "country" : "Saudi Arabia",
                "city" : "Jeddah",
                "address" : "",
                "status" : "Enabled",
                "createdAt" : new Date(),
                "role" : "Salesman",
                "token" : "",
                "emailActive" : "Enabled",
                "inviterEmailList" : [],
                "ipAddress" : "127.0.0.1",
                "loginCount" : 9,
                "birthDay" : "",
                "companyName": dCompany._id.toString(),
                "gender" : "Female",
                "nameAr" : "Wafaty Salesman",
                "nameEn" : "Wafaty Salesman",
                "nationality" : "Jordan",
                "isDoneProfile" : true,
                "gpsLat" : null,
                "gpsLong" : null,
                "isDefault": true,
                "commissions" : config.defaultCommissions.Salesman
            });
            await dSalesman.save();
        }
        let dDoctor = await UserModel.findOne({role:'Doctor', isDefault: true});
        if (!dDoctor) {
            dDoctor = new UserModel({
                "email" : "doctor@wasfaty.com",
                "password" : "c4ca4238a0b923820dcc509a6f75849b",
                "phone" : "234",
                "pic" : "/uploads/avatar/avatar_E48uqenvUb.png",
                "country" : "Saudi Arabia",
                "city" : "Jeddah",
                "address" : "Junt",
                "status" : "Enabled",
                "createdAt" : new Date(),
                "role" : "Doctor",
                "token" : "e5g4Gc8zws",
                "emailActive" : "Enabled",
                "__v" : 1,
                "inviterEmailList" : [
                    "salesman@wasfaty.com"
                ],
                "ipAddress" : "127.0.0.1",
                "loginCount" : 207,
                "birthDay" : "05/06/2019",
                "gender" : "Male",
                "insuranceCompany" : "company32",
                "insuranceGrade" : "company32",
                "insuranceType" : "type-1",
                "isDoneProfile" : true,
                "nameAr" : "Wasfaty Doctor",
                "nameEn" : "Wasfaty Doctor",
                "nationality" : "Jordan",
                "spec" : "",
                "isDefault": true,
                "commissions" : config.defaultCommissions.Doctor
            });
            await dDoctor.save();
        }
        let dPharmacy = await UserModel.findOne({role:'Pharmacy', isDefault: true});
        if (!dPharmacy) {
            dPharmacy = new UserModel({
                "email" : "pharmacy@wasfaty.com",
                "password" : "c4ca4238a0b923820dcc509a6f75849b",
                "phone" : "234",
                "pic" : "/uploads/avatar/avatar_E48uqenvUb.png",
                "country" : "Saudi Arabia",
                "city" : "Jeddah",
                "address" : "Junt",
                "status" : "Enabled",
                "createdAt" : new Date(),
                "role" : "Pharmacy",
                "token" : "e5g4Gc8zws",
                "emailActive" : "Enabled",
                "__v" : 1,
                "inviterEmailList" : [],
                "ipAddress" : "127.0.0.1",
                "loginCount" : 207,
                "birthDay" : "05/06/2019",
                "gender" : "Male",
                "insuranceCompany" : "company32",
                "insuranceGrade" : "company32",
                "insuranceType" : "type-1",
                "isDoneProfile" : true,
                "nameAr" : "Wasfaty Pharmacy",
                "nameEn" : "Wasfaty Pharmacy",
                "nationality" : "Jordan",
                "spec" : "",
                "isDefault": true,
                "companyName": dCompany._id.toString(),
                "commissions" : config.defaultCommissions.Pharmacy
            });
            await dPharmacy.save();
        }
        // Add default commissions
        let commissions = await SettingModel.findOne({settingKey: "commissions"});
        if (!commissions) {
            await SettingModel.collection.insertOne({
                settingKey: "commissions",
                content: {
                    Salesman: 20,
                    Doctor: 30,
                    Pharmacy: 10,
                    Company: 25,
                    Wasfaty: 60
                }
            })
        }
        // Add default driver fee
        let driverFee = await SettingModel.findOne({settingKey: "driver_fee"});
        if (!driverFee) {
            await SettingModel.collection.insertOne({
                settingKey: "driver_fee",
                content: 20
            })
        }
        // Add default Loyalty point
        let loyaltyPoint = await SettingModel.findOne({settingKey: "loyalty_point"});
        if (!loyaltyPoint) {
            await SettingModel.collection.insertOne({
                settingKey: "loyalty_point",
                content: 1
            })
        }
    }
});
