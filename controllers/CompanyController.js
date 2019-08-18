let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto,
    nodemailer, transporter, View, ItemModel;
let UserModel, countryList, OrderModel;

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
OrderModel = require('../models/order');
countryList = require('../config/country');
ItemModel = require('../models/item');

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
    name: 'CompanyController',
    showDashboard: async function (req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/company/dashboard';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Company') {
            return res.redirect('/*');
        }
        if (!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }
        let totalItemCnt = await ItemModel.countDocuments();
        let totalAmount = 0;
        let totalQty = 0;
        let i = 0, j = 0;
        let closedOrders = await OrderModel.find({status: 'Closed'});
        for (i = 0; i < closedOrders.length; i++) {
            for (j = 0; j < closedOrders[i].items.length; j++) {
                let item = closedOrders[i].items[j];
                let itemDetails = await ItemModel.findOne({itemId: item.code});
                if (itemDetails && itemDetails.cpyNameId == req.session.user._id) {
                    totalAmount += Number(item.amount);
                    totalQty += Number(item.qty);
                }
            }
        }
        let allSalesMans = await UserModel.find({role: 'Salesman', companyName: req.session.user._id});
        let allSalesmanEmails = [];
        for (i = 0; i < allSalesMans.length; i++) {
            allSalesmanEmails.push(allSalesMans[i].email);
        }
        let doctors = await UserModel.find({role: 'Doctor'});
        let doctorCount = 0;
        for (i = 0; i < doctors.length; i++) {
            let existingDoctor = false;
            for (j = 0; j < doctors[i].inviterEmailList.length; j++) {
                if (allSalesmanEmails.indexOf(doctors[i].inviterEmailList[j]) > -1) {
                    existingDoctor = true;
                }
            }
            if (existingDoctor) {
                doctorCount++;
            }
        }
        let qtyGraphData = await this.itemQtyGraphData(req.session.user._id);
        let doctorGraphData = await this.doctorGraphData(req.session.user._id);
        let v;
        v = new View(res, 'backend/company/dashboard');
        v.render({
            title: 'Dashboard',
            totalItemCnt: totalItemCnt,
            totalAmount: totalAmount,
            totalQty: totalQty,
            doctorCount: doctorCount,
            doctorGraphData: doctorGraphData,
            qtyGraphData: qtyGraphData,
            session: req.session,
        });
    },
    doctorGraphData: async function (companyId) {
        let graphData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //Total 12 Month
        let i, j;
        let allSalesMans = await UserModel.find({role: 'Salesman', companyName: companyId});
        let allSalesmanEmails = [];
        for (i = 0; i < allSalesMans.length; i++) {
            allSalesmanEmails.push(allSalesMans[i].email);
        }
        let doctors = await UserModel.find({role: 'Doctor'});
        for (i = 0; i < doctors.length; i++) {
            let existingDoctor = false;
            for (j = 0; j < doctors[i].inviterEmailList.length; j++) {
                if (allSalesmanEmails.indexOf(doctors[i].inviterEmailList[j]) > -1) {
                    existingDoctor = true;
                }
            }
            if (existingDoctor) {
                let month = new Date(doctors[i].createdAt).getMonth();
                graphData[month]++;
            }
        }
        return graphData;
    },
    itemQtyGraphData: async function (companyId) {
        let closedOrders = await OrderModel.find({status: 'Closed'});
        let graphData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //Total 12 Month
        let i, j;
        for (i = 0; i < closedOrders.length; i++) {
            for (j = 0; j < closedOrders[i].items.length; j++) {
                let itemInfo = await ItemModel.findOne({itemId: closedOrders[i].items[j].code});
                if (itemInfo.cpyNameId == companyId) {
                    let month = new Date(closedOrders[i].updatedAt).getMonth();
                    graphData[month] += Number(closedOrders[i].items[j].qty);
                }
            }
        }
        return graphData;
    },
    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/company';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin' && req.session.user.role != 'Pharmacy') {
            return res.redirect('/*');
        }
        users = await UserModel.find({role: 'Company'});
        v = new View(res, 'backend/company/list');
        v.render({
            title: 'Company List',
            session: req.session,
            countries: countryList,
            users: users
        });
    },
    showCompanyDoctors: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/company/doctor';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Company') {
            return res.redirect('/*');
        }
        let salesmanUsers = await UserModel.find({
            companyName: req.session.user._id,
            role: 'Salesman'
        }).sort({createdAt: -1});
        let salesmanEmails = salesmanUsers.map((su) => su.email);
        let doctors = await UserModel.find({role: 'Doctor'}).sort({createdAt: -1});
        let users = [];
        for (let i = 0; i < doctors.length; i++) {
            let existDriver = false;
            for (let j = 0; j<salesmanEmails.length; j++) {
                if (doctors[i].inviterEmailList.indexOf(salesmanEmails[j])>-1) {
                    existDriver = true;
                }
            }
            if (existDriver) {
                 users.push(doctors[i]);
            }

        }

        v = new View(res, 'backend/company/doctor-list');
        v.render({
            title: 'Doctor List',
            session: req.session,
            users: users,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    showCompanySalesman: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/company/salesman';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Company') {
            return res.redirect('/*');
        }
        let users = await UserModel.find({companyName: req.session.user._id, role: 'Salesman'}).sort({createdAt: -1});
        v = new View(res, 'backend/company/salesman-list');
        v.render({
            title: 'Salesman List',
            session: req.session,
            users: users,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    add: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/company/add';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        v = new View(res, 'backend/invite/add');
        v.render({
            title: 'Company List',
            session: req.session,
            user_type: "Company",
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    edit: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let userId = req.params.userId;
        let userInfo = await UserModel.findOne({_id: userId});
        if (userInfo != null) {
            if (req.session.user.role != 'Admin' && req.session.user._id != userInfo._id) {
                return res.redirect('/*');
            }
            v = new View(res, 'backend/user/edit');
            v.render({
                title: 'Profile',
                session: req.session,
                countries: countryList,
                user_info: userInfo,
                error: req.flash("error"),
                success: req.flash("success"),
            });
        } else {
            return res.redirect('/*')
        }
    },
    delete: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let userId = req.params.userId;
        let userInfo = await UserModel.findOne({_id: userId});
        if (userInfo != null) {
            await userInfo.remove();
        }
        return res.redirect('/admin/company');
    },

});
