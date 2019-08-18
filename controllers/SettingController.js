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
    }
});
