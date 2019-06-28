let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, View;
let UserModel, countryList;
let ItemModel, MasterItemModel;

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

ItemModel = require('../models/item');
MasterItemModel = require('../models/masterItem');

BaseController = require('./BaseController');
View = require('../views/base');

module.exports = BaseController.extend({
    name: 'ItemController',
    showItems: async function (req, res) {
        let v, items;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/item';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin' && req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        items = await ItemModel.find();
        v = new View(res, 'backend/master/list');
        v.render({
            title: 'Item List',
            session: req.session,
            items: items
        });
    },
    showAddItems: async function (req, res) {
        let v, opType, itemId, itemInfo, subMasterItems;
        opType = req.params.op;
        if (req.params.op != 'edit' && req.params.op != 'add' && req.params.op != 'view') {
            return res.redirect('/*');
        }
        if (opType != 'add') {
            itemId = req.query.id;
        }

        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/item/' + opType;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin' && req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        if (opType != 'add') {
            itemInfo = await ItemModel.findOne({itemId: itemId});
            if (!itemInfo) {
                return res.redirect('/*');
            }
        }

        if (req.session.user.role == 'Doctor' && opType != 'view') {
            return res.redirect('/*');
        }

        // Get child item select box....
        let itemKeys = config.masterItemKeys;
        for (let key in itemKeys) {
            if (itemKeys.hasOwnProperty(key)) {
                itemKeys[key]['list'] =  await MasterItemModel.find({mtType: itemKeys[key].type});
            }
        }

        v = new View(res, 'backend/master/edit');
        v.render({
            title: 'Item List',
            page_mode: opType,
            item_info: itemInfo,
            itemKeys: itemKeys,
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    updateItems: async function (req, res) {
        let itemInfo, itemId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/item';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let pageMode = req.params.op;
        // Missing duplication name checking
        if (pageMode == 'edit') {
            itemId = req.query.id;
            itemInfo = await ItemModel.findOne({itemId: itemId});
            itemInfo = Object.assign(itemInfo, req.body);
            await itemInfo.save();
        } else {
            req.body['createdAt'] = new Date();
            req.body.itemId = this.makeItemCode('', 20);
            await ItemModel.collection.insertOne(req.body);
        }
        if (pageMode == 'edit') {
            req.flash('success', 'Updated item successfully!');
        } else {
            req.flash('success', 'Added new item successfully!');
        }

        let backurl = '/admin/item/' + pageMode;
        if (pageMode == 'edit') {
            backurl += '?id=' + itemId;
        }
        return res.redirect(backurl);
    },
    deleteItem: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let id = req.params.id;
        await ItemModel.deleteOne({itemId: id});
        return res.redirect('/admin/item');
    },
    uploadItemImage: async function (req, res) {
        let upload_file, fn, ext, dest_fn;
        upload_file = req.files.file;
        fn = upload_file.name;
        ext = fn.substr(fn.lastIndexOf('.') + 1).toLowerCase();
        if (ext == 'blob') ext = 'png';
        dest_fn = this.makeItemCode('item_', 10) + "." + ext;
        upload_file.mv('public/uploads/item/' + dest_fn, async function (err) {
            if (err) {
                console.log('File Uploading Error');
                console.log(err);
                return res.send({status: 'fail', data: 'Item Image Uploading Error'});
            }
            return res.send({status: 'success', data: '/uploads/item/' + dest_fn});
        });
    },
    makeItemCode: function (prefix = "", length = 10) {
        var text = "";
        var possible = "0123456789";
        for (var i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return (prefix + text);
    },
});
