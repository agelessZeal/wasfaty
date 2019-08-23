let _, async, mongoose, BaseController;
let config;
let View;

let SettingModel;

async = require("async");
mongoose = require('mongoose');
config = require('../config/index');

BaseController = require('./BaseController');
View = require('../views/base');

SettingModel = require("../models/setting");

module.exports = BaseController.extend({
    name: 'SettingController',
    showCommissions: async function (req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/admin/setting/commissions';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role  != 'Admin') {
            return  res.redirect('/*');
        }
        let v;
        let comms = await SettingModel.findOne({settingKey: "commissions"});
        v = new View(res, 'backend/setting/index');
        v.render({
            title: 'Settings',
            comms: comms.content,
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),

        });
    },
    updateCommissions: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/admin/setting/commissions';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role  != 'Admin') {
            return  res.redirect('/*');
        }
        let comms = await SettingModel.findOne({settingKey: "commissions"});
        comms.content = req.body;
        await comms.save();
        req.flash("success", "Updated Default Commissions!");
        return res.redirect('/admin/setting/commissions');
    },
    showDriverFee: async function (req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/admin/setting/driver-fee';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role  != 'Admin') {
            return  res.redirect('/*');
        }
        let v;
        let driverFee = await SettingModel.findOne({settingKey: "driver_fee"});
        v = new View(res, 'backend/setting/driver-fee');
        v.render({
            title: 'Driver fees',
            driverFee: driverFee.content,
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),

        });
    },
    updateDriverFee: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/admin/setting/driver-fee';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role  != 'Admin') {
            return  res.redirect('/*');
        }
        let driverFee = await SettingModel.findOne({settingKey: "driver_fee"});
        driverFee.content = req.body.driverFee;
        await driverFee.save();
        req.flash("success", "Updated Default driver fee!");
        return res.redirect('/admin/setting/driver-fee');
    },
    showLoyaltyPoint: async function (req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/admin/setting/loyalty-fee';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role  != 'Admin') {
            return  res.redirect('/*');
        }
        let v;
        let loyaltyPoint = await SettingModel.findOne({settingKey: "loyalty_point"});
        v = new View(res, 'backend/setting/loyalty-point');
        v.render({
            title: 'Loyalty Point',
            loyaltyPoint: loyaltyPoint.content,
            session: req.session,
            error: req.flash("error"),
            success: req.flash("success"),

        });
    },
    updateLoyaltyPoint: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/admin/setting/loyalty-point';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role  != 'Admin') {
            return  res.redirect('/*');
        }
        let loyaltyPoint = await SettingModel.findOne({settingKey: "loyalty_point"});
        loyaltyPoint.content = req.body.loyaltyPoint;
        await loyaltyPoint.save();
        req.flash("success", "Updated Default Loyalty Point!");
        return res.redirect('/admin/setting/loyalty-point');
    }
});
