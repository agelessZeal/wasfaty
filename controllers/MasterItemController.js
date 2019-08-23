let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList;
let MasterItem;

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

MasterItem = require('../models/masterItem');

BaseController = require('./BaseController');
View = require('../views/base');

module.exports = BaseController.extend({
    name: 'MasterItemController',
    showMasterItems: async function (req, res) {
        let v, mtDataList, title, typePos;
        let mtType = req.params.mtType;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/master-item/update/' + mtType;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }

        typePos = config.masterItemURLs.indexOf(mtType);
        console.log(typePos, mtType);
        if (typePos > -1) {
            title = config.masterItemNames[typePos];
        } else {
            return res.redirect('/*');
        }

        mtDataList = await MasterItem.find({mtType: mtType});
        v = new View(res, 'backend/master/item/list');
        v.render({
            title: title,
            mtType: mtType,
            session: req.session,
            data_list: mtDataList
        });
    },
    showAddMasterItems: async function (req, res) {

        let v, opType, itemId, itemInfo, mtType, title, typePos;
        opType = req.params.op;
        mtType = req.params.mtType;
        if (req.params.op != 'edit' && req.params.op != 'add') {
            return res.redirect('/*');
        }

        if (opType == 'edit') {
            itemId = req.query.id;
        }

        if (!this.isLogin(req)) {
            req.session.redirectTo = '/master-item/update/' + mtType + '/' + opType;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        if (opType == 'edit') {
            itemInfo = await MasterItem.findOne({mtId: itemId});
            if (!itemInfo) {
                return res.redirect('/*');
            }
        }
        typePos = config.masterItemURLs.indexOf(mtType);
        if (typePos > -1) {
            title = config.masterItemNames[typePos];
        }
        v = new View(res, 'backend/master/item/edit');
        v.render({
            title: title,
            mtType: mtType,
            page_mode: opType,
            item_info: itemInfo,
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    updateMasterItems: async function (req, res) {
        let itemInfo, itemid;
        let mtType = req.params.mtType;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/master-item/update/' + mtType;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let pageMode = req.params.op;
        // Missing duplication name checking
        if (pageMode == 'edit') {
            itemid = req.query.id;
            itemInfo = await MasterItem.findOne({mtId: itemid});
            itemInfo = Object.assign(itemInfo, req.body);
            await itemInfo.save();
        } else {
            req.body['createdAt'] = new Date();
            req.body.mtId = this.makeID('MI', 20);
            req.body.mtType = mtType;
            await MasterItem.collection.insertOne(req.body);
        }
        if (pageMode == 'edit') {
            req.flash('success', 'Updated item successfully!');
        } else {
            req.flash('success', 'Added new item successfully!');
        }

        let backurl = '/master-item/update/' + mtType+ '/' + pageMode;
        if (pageMode == 'edit') {
            backurl += '?id=' + itemid;
        }
        return res.redirect(backurl);
    },
    deleteMasterItem: async function (req, res) {
        let mtType =  req.params.mtType;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let id = req.params.id;
        await MasterItem.deleteOne({mtId: id});
        return res.redirect('/master-item/update/' + mtType);
    },

});
