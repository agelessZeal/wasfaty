let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, InviteModel, countryList;

let OrderItemHistModel,ItemModel;
let OrderModel;

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
InviteModel = require('../models/invite');
OrderModel = require('../models/order');

OrderItemHistModel = require('../models/OrderItemHistory');
ItemModel = require('../models/item');

countryList = require('../config/country');
BaseController = require('./BaseController');
View = require('../views/base');

let d = new Date();


transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.node_mail.mail_account,
        pass: config.node_mail.password
    }
});


module.exports = BaseController.extend({
    name: 'SalesmanController',
    showDashboard: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/salesman/dashboard';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Salesman') {
            return res.redirect('/*');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }
        let v;
        v = new View(res, 'backend/salesman/dashboard');

        let dt = new Date();
        dt.setUTCHours(0,0,0,0); // Today time

        let todayClosedOrders = await OrderItemHistModel.find({orderDate: {$gte: dt}, email: req.session.user.email});
        let todayCommissions = 0, i;
        for (i = 0; i < todayClosedOrders.length; i++) {
            todayCommissions += Number(todayClosedOrders[i].commAmount);
        }
        todayCommissions = Number(todayCommissions.toFixed(2));

        dt.setDate(1);
        let monthClosedOrders = await OrderItemHistModel.find({orderDate: {$gte: dt}, email: req.session.user.email});
        let monthCommissions = 0;
        for (i = 0; i < monthClosedOrders.length; i++) {
            monthCommissions += Number(monthClosedOrders[i].commAmount);
        }
        monthCommissions = Number(monthCommissions.toFixed(2));

        let doctorCount = 0;
        let salesmanDoctors = [];
        let allDoctors = await UserModel.find({role:'Doctor', isDoneProfile: true});
        for (i = 0; i<allDoctors.length; i++) {
            if (allDoctors[i].inviterEmailList.indexOf(req.session.user.email) > -1) {
                doctorCount++;
                salesmanDoctors.push(allDoctors[i]);
            }
        }

        let companyInfo = await UserModel.findOne({_id: req.session.user.companyName});
        let wasfatyCompanyInfo = await UserModel.findOne({role: "Company", isDefault: true});
        if (!companyInfo) {
            companyInfo = wasfatyCompanyInfo;
        }

        let monthClosedCompanyOrders = await OrderItemHistModel.find({orderDate: {$gte: dt}, email: companyInfo.email});

        console.log("-----------------", companyInfo.email);

        let monthCompanyItemAmount = 0;
        for (i = 0; i < monthClosedCompanyOrders.length; i++) {
            monthCompanyItemAmount += Number(monthClosedCompanyOrders[i].totalAmount);
        }
        monthCompanyItemAmount = Number(monthCompanyItemAmount.toFixed(2));

        let doctorGraphData = await this.clientGraphData(salesmanDoctors);
        let commGraphData = await this.commissionGraphData(req.session.user.email);

        v.render({
            title: 'Dashboard',
            session: req.session,
            todayCommission: todayCommissions,
            monthCommission: monthCommissions,

            totalItemAmount: monthCompanyItemAmount,
            doctorCount: doctorCount,

            commGraphData: commGraphData,
            clientGraphData: doctorGraphData
        });
    },
    commissionGraphData: async function (doctorEmail) {

        let dt = new Date();
        dt.setMonth(0)
        dt.setDate(0);
        dt.setUTCHours(0,0,0,0);

        let commHistData = await OrderItemHistModel.find({email: doctorEmail, orderDate: {$gte: dt}});

        let graphData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //Total 12 Month
        let i;
        for (i = 0; i < commHistData.length; i++) {
            let month = new Date(commHistData[i].orderDate).getMonth();
            graphData[month] += Number(commHistData[i].commAmount);
        }

        for (i = 0; i< graphData.length ; i++) {
            graphData[i] = Number(graphData[i].toFixed(2));
        }

        return graphData;
    },
    clientGraphData: async function (clients) {
        let graphData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //Total 12 Month
        let i;
        for (i = 0; i < clients.length; i++) {
            let month = new Date(clients[i].createdAt).getMonth();
            graphData[month]++;
        }
        return graphData;
    },
    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/salesman';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }

        let companyUsers = await UserModel.find({role:'Company'});
        let companyObj = {};
        for ( let i = 0; i < companyUsers.length; i++) {
            companyObj[companyUsers[i]._id] = companyUsers[i];
        }

        users = await UserModel.find({role: 'Salesman'});
        v = new View(res, 'backend/salesman/list');
        v.render({
            title: 'Salesman List',
            session: req.session,
            users: users,
            companyObj: companyObj
        });
    },
    showDoctorList: async function (req, res){
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/salesman/doctor/list';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Salesman') {
            return res.redirect('/*');
        }
        users = await UserModel.aggregate([
            {$match:{role: 'Doctor'}},
            {$lookup: {from: 'specialists', localField: 'spec', foreignField: 'specId', as: 'spec'}},
        ]);
        let retUsers = [];
        for (let i = 0; i<users.length; i++) {
            if (users[i].inviterEmailList.indexOf(req.session.user.email) > -1) {
                retUsers.push(users[i]);
            }

        }
        v = new View(res, 'backend/doctor/doctor-list');
        v.render({
            title: 'Doctor List',
            session: req.session,
            users: retUsers
        });
    },
    addInvite: async function(req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/salesman/invite/list';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Salesman') {
            return res.redirect('/*');
        }
        v = new View(res, 'backend/invite/add');
        v.render({
            title: 'Invitation List',
            session: req.session,
            user_type: 'Doctor',
            user_levels: config.userLevels,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    showMyOrders: async function(req, res) {
        let v, orders;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/salesman/orders';
            return res.redirect('/auth/login');
        }

        // Search filters
        let fromDate, toDate;
        let dtQuery = {$gte: "2010-01-01"};
        if (req.query.fromDate) {
            fromDate = new Date(req.query.fromDate);
            dtQuery = {$gte: fromDate};
        }

        if (req.query.toDate) {
            toDate = new Date(req.query.toDate);
            toDate.setUTCHours(23, 59, 0, 0);
            dtQuery['$lte'] = toDate;
        }

        let salesmanDoctors = await UserModel.find({role:'Doctor'});
        let doctorEmails = salesmanDoctors.map((item) => item.email);

        orders = await OrderModel.find({
            doctorEmail: doctorEmails,
            status: {$ne: 'Closed'},
            createdAt: dtQuery
        }).sort({createdAt: -1});

        v = new View(res, 'backend/salesman/my-orders');
        v.render({
            title: 'Orders',
            session: req.session,
            data_list: orders,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate
        });
    },

    showMyOrderReports: async function(req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/pharmacy/reports';
            return res.redirect('/auth/login');
        }

        if (req.session.user.role != "Salesman") {
            return res.redirect('/*');
        }

        // Search filters
        let fromDate, toDate;
        let dtQuery = {$gte: "2010-01-01"};
        if (req.query.fromDate) {
            fromDate = new Date(req.query.fromDate);
            dtQuery = {$gte: fromDate};
        }

        if (req.query.toDate) {
            toDate = new Date(req.query.toDate);
            toDate.setUTCHours(23, 59,0,0);
            dtQuery['$lte'] = toDate;
        }

        let items = await ItemModel.find();
        let itemObj = {};
        for (let i = 0; i<items.length; i++) {
            itemObj[items[i].itemId] = items[i];
        }
        let orderItemHist = await OrderItemHistModel.find({email: req.session.user.email, orderDate: dtQuery}).sort({orderDate: -1});

        console.log(dtQuery);

        let v = new View(res, 'backend/salesman/my-reports');
        v.render({
            title: 'Order Reports',
            session: req.session,
            data_list: orderItemHist,
            itemObj: itemObj,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate
        });
    }
});
