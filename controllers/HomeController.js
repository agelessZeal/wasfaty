let _, async, mongoose, BaseController, View;
let config, axios, request, fs;
let UserModel, MasterItemModel, ProductModel;
let SettingModel;

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
    }
});
