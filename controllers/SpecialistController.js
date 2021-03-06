let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList;
let SpecModel;

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

SpecModel = require('../models/specialist');

BaseController = require('./BaseController');
View = require('../views/base');

module.exports = BaseController.extend({
    name: 'SpecialistController',
    showSpecItems: async function (req, res) {
        let v, specDataList;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/specialist';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        specDataList = await SpecModel.find();
        v = new View(res, 'backend/master/spec/list');
        v.render({
            title: 'Doctor Specialist',
            session: req.session,
            data_list: specDataList
        });
    },
    showAddSpecItems: async function (req, res) {
        let v, opType, itemId, itemInfo;
        opType = req.params.op;

        if (req.params.op != 'edit' && req.params.op != 'add') {
            return res.redirect('/*');
        }

        if (opType == 'edit') {
            itemId = req.query.id;
        }

        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/specialist/' + opType;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        if (opType == 'edit') {
            itemInfo = await SpecModel.findOne({specId: itemId});
            if (!itemInfo) {
                return res.redirect('/*');
            }
        }

        v = new View(res, 'backend/master/spec/edit');
        v.render({
            title: 'Doctor Specialist',
            page_mode: opType,
            item_info: itemInfo,
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    updateSpecItems: async function (req, res) {
        let itemInfo, itemid;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/specialist';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let pageMode = req.params.op;
        // Missing duplication name checking
        if (pageMode == 'edit') {
            itemid = req.query.id;
            itemInfo = await SpecModel.findOne({specId: itemid});
            itemInfo = Object.assign(itemInfo, req.body);
            await itemInfo.save();
        } else {
            req.body['createdAt'] = new Date();
            req.body.specId = this.makeID('SP', 20);
            await SpecModel.collection.insertOne(req.body);
        }
        if (pageMode == 'edit') {
            req.flash('success', 'Updated item successfully!');
        } else {
            req.flash('success', 'Added new item successfully!');
        }

        let backurl = '/admin/specialist/' + pageMode;
        if (pageMode == 'edit') {
            backurl += '?id=' + itemid;
        }
        return res.redirect(backurl);
    },
    deleteSpecItem: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let id = req.params.id;
        await SpecModel.deleteOne({specId: id});
        return res.redirect('/admin/specialist');
    },

});
