let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList;
let InsGradeModel, InsTypeModel, InsCompanyModel;

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

InsGradeModel = require('../models/insuranceGrade');
InsCompanyModel = require('../models/insuranceCompany');
InsTypeModel = require('../models/insuranceType');

BaseController = require('./BaseController');
View = require('../views/base');

module.exports = BaseController.extend({
    name: 'InsuranceController',
    showInsItems: async function (req, res) {
        let v, insDataList, insType, title, addBtnTxt;
        insType = req.params.ins_type;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/insurance/' + insType;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        if (insType == 'companies') {
            insDataList = await InsCompanyModel.find();
            title = 'Companies';
            addBtnTxt = 'Insurance Company';
        } else if (insType == 'types') {
            insDataList = await InsTypeModel.find();
            title = 'Types';
            addBtnTxt = 'Insurance Type';
        } else {
            insType = 'grades';
            insDataList = await InsGradeModel.find();
            title = 'Grades';
            addBtnTxt = 'Insurance Grade';
        }
        v = new View(res, 'backend/master/insurance/list');
        v.render({
            title: 'Insurance ' + title,
            ins_type: insType,
            add_btn_text: addBtnTxt,
            session: req.session,
            data_list: insDataList
        });
    },
    showAddInsItems: async function (req, res) {
        let v, insType, pageTitle, tabTitle, opType, itemId, itemInfo;
        insType = req.params.ins_type;

        opType = req.params.op;

        if (req.params.op != 'edit' && req.params.op != 'add') {
           return res.redirect('/*');
        }

        if (opType == 'edit') {
            itemId  = req.query.id;
        }

        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/insurance/' + opType + '/' + insType;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        if (insType == 'companies') {
            pageTitle = 'Company';
            tabTitle = 'Companies';
            if (opType == 'edit') {
                itemInfo = await InsCompanyModel.findOne({_id:itemId});
                if(!itemInfo) {
                    return res.redirect('/*');
                }
            }

        } else if (insType == 'types') {
            pageTitle = 'Type';
            tabTitle = 'Types';
            if (opType == 'edit') {
                itemInfo = await InsTypeModel.findOne({_id:itemId});
                if(!itemInfo) {
                    return res.redirect('/*');
                }
            }
        } else {
            insType = 'grades';
            pageTitle = 'Grade';
            tabTitle = 'Grades';
            if (opType == 'edit') {
                itemInfo = await InsGradeModel.findOne({_id:itemId});
                if(!itemInfo) {
                    return res.redirect('/*');
                }
            }
        }

        v = new View(res, 'backend/master/insurance/edit');
        v.render({
            title: 'Insurance ' + tabTitle,
            page_title: pageTitle,
            page_mode: opType,
            item_info: itemInfo,
            ins_type: insType,
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    updateInsItems: async function (req, res) {
        let insType, itemInfo, itemid;
        insType = req.params.ins_type;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/insurance/add/' + insType;
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let pageMode = req.params.op;
        // Missing duplication name checking
        if (pageMode == 'edit') {
            itemid = req.query.id;
            if(insType == 'companies') {
                itemInfo = await InsCompanyModel.findOne({_id: itemid});
            } else if(insType == 'types') {
                itemInfo = await InsTypeModel.findOne({_id: itemid});
            } else {
                itemInfo = await InsGradeModel.findOne({_id: itemid});
            }
            itemInfo = Object.assign(itemInfo, req.body);
            await itemInfo.save();
        } else {
            req.body['createdAt'] = new Date();
            if(insType == 'companies') {
                await InsCompanyModel.collection.insertOne(req.body);
            } else if(insType == 'types') {
                await InsTypeModel.collection.insertOne(req.body);
            } else {
                await InsGradeModel.collection.insertOne(req.body);
            }
        }
        if (pageMode == 'edit') {
            req.flash('success', 'Updated item successfully!');
        } else {
            req.flash('success', 'Added new item successfully!');
        }

        let backurl = '/admin/insurance/'+ pageMode + '/' + insType;
        if (pageMode == 'edit') {
            backurl += '?id=' + itemid;
        }
        return res.redirect(backurl);
    },
    deleteInsItem: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let id = req.params.id;
        let insType = req.params.ins_type;
        let instypes = ['companies', 'grades', 'types'];
        if (instypes.indexOf(insType)<0) {
            return res.redirect('/*');
        }
        if (insType == 'companies') {
            await InsCompanyModel.deleteOne({_id: id});
        } else if (insType == 'types') {
            await InsTypeModel.deleteOne({_id: id});
        } else {
            await InsGradeModel.deleteOne({_id: id});
        }
        return res.redirect('/admin/insurance/' + insType);
    },

});
