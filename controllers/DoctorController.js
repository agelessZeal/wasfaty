let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, InviteModel, countryList, OrderModel;

let ItemModel, OrderItemHistModel;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
config = require('../config/index');
fs = require('fs');
crypto = require('crypto');
request = require('request');
nodemailer = require('nodemailer');
ejs = require('ejs');
countryList = require('../config/country');
ItemModel = require('../models/item');
OrderItemHistModel = require('../models/OrderItemHistory');

UserModel = require('../models/user');
InviteModel = require('../models/invite');
OrderModel = require('../models/order');

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
    name: 'DoctorController',
    showDashboard: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/doctor/dashboard';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }

        let dt = new Date();
        dt.setUTCHours(0,0,0,0); // Today time

        let todayClosedOrders = await OrderItemHistModel.find({orderDate: {$gte: dt}, email: req.session.user.email});
        let todayCommissions = 0, i;
        for (i = 0; i < todayClosedOrders.length; i++) {
            todayCommissions += Number(todayClosedOrders[i].commAmount);
        }
        todayCommissions = Number(todayCommissions.toFixed(2));

        let todayOrders = await OrderModel.countDocuments({createdAt: {$gte: dt}, doctorEmail: req.session.user.email});

        dt.setDate(1);
        let monthClosedOrders = await OrderItemHistModel.find({orderDate: {$gte: dt}, email: req.session.user.email});
        let monthCommissions = 0;
        for (i = 0; i < monthClosedOrders.length; i++) {
            monthCommissions += Number(monthClosedOrders[i].commAmount);
        }
        monthCommissions = Number(monthCommissions.toFixed(2));

        // Doctor Clients
        let clients = await UserModel.find({role:'Client', isDoneProfile: true});
        let retClients = 0;
        let rectClientInfos = [];
        for (let i = 0; i < clients.length; i++) {
            if (clients[i].inviterEmailList.indexOf(req.session.user.email) > -1 ) {
                retClients++;
                rectClientInfos.push(clients[i]);
            }
        }

        let clientGraphData = await this.clientGraphData(rectClientInfos);
        let commGraphData = await this.commissionGraphData(req.session.user.email);

        let marketIndicator = await this.getPerformance(req.session.user.email);

        let v;
        v = new View(res, 'backend/doctor/dashboard');
        v.render({
            title: 'Dashboard',
            session: req.session,
            todayCommission: todayCommissions,
            monthCommission: monthCommissions,
            todayOrders: todayOrders,
            clientCount: retClients,
            commGraphData: commGraphData,
            clientGraphData: clientGraphData,
            marketIndicator: marketIndicator
        });
    },
    commissionGraphData: async function (doctorEmail) {

        let dt = new Date();
        dt.setMonth(0);
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
            req.session.redirectTo = '/admin/doctor';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin' && req.session.user.role != 'CallCenter') {
            return res.redirect('/*');
        }
        users = await UserModel.aggregate([
            {$match:{role: 'Doctor'}},
            {$lookup: {from: 'specialists', localField: 'spec', foreignField: 'specId', as: 'spec'}},
        ]);
        v = new View(res, 'backend/doctor/list');
        v.render({
            title: 'Doctor List',
            session: req.session,
            countries: countryList,
            users: users,
        });
    },
    showInviteList: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/doctor/my-invitation';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        let invites = await InviteModel.find({receiverEmail: req.session.user.email});
        v = new View(res, 'backend/invite/salesman-list');
        v.render({
            title: 'My Invitation',
            session: req.session,
            invites:invites,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },
    showClients: async function(req, res) {
        let v;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/doctor/clients';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Doctor') {
            return res.redirect('/*');
        }
        let clients = await UserModel.find({role:'Client', isDoneProfile: true});
        let retClients = [];
        for (let i = 0; i < clients.length; i++) {
            if (clients[i].inviterEmailList.indexOf(req.session.user.email) > -1 ) {
                retClients.push(clients[i])
            }
        }

        v = new View(res, 'backend/doctor/client-list');
        v.render({
            title: 'Clients',
            session: req.session,
            clients:retClients,
            error: req.flash("error"),
            success: req.flash("success"),
        });
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
        return res.redirect('/admin/doctor');
    },
    showMyOrderReports: async function (req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/doctor/reports';
            return res.redirect('/auth/login');
        }

        if (req.session.user.role != "Doctor") {
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

        let v = new View(res, 'backend/doctor/my-reports');
        v.render({
            title: 'Order Reports',
            session: req.session,
            data_list: orderItemHist,
            itemObj: itemObj,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate
        });
    },
    getPerformance: async function(userEmail) {
        let commHistData = await OrderItemHistModel.find();
        let totalAmount = 0;
        let myOrderAmount = 0;
        for (let i = 0; i<commHistData.length; i++) {
            totalAmount += Number(commHistData[i].totalAmount);
            if (commHistData[i].email == userEmail) {
                myOrderAmount += Number(commHistData[i].totalAmount);
            }
        }

        console.log(totalAmount, myOrderAmount, '===============Doctor Order Data=====================');

        if (commHistData.length == 0) {
             return 1.00;
        } else {
            if (totalAmount > 0) {
                let performanceStar = (5 * myOrderAmount / totalAmount + 1);
                if (performanceStar > 5) {
                    return 5.00;
                } else {
                    return Number(performanceStar).toFixed(2);
                }
            } else {
                return 1.00;
            }
        }
    }
});
