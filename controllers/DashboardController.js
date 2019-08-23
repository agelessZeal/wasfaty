let _, async, mongoose, BaseController, View;
let config, axios, request, fs;
let UserModel;

let nodemailer, ejs, transporter;

let OrderModel;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
config = require('../config/index');
fs = require('fs');

UserModel = require('../models/user');
OrderModel = require('../models/order');

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
    name: 'DashboardController',
    index: async function (req,  res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/dashboard';
            return res.redirect('/auth/login');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }
        if (req.session.user.role == 'Company') {
            return res.redirect('/company/dashboard');
        } else if (req.session.user.role == 'Salesman') {
            return res.redirect('/salesman/dashboard');
        } else if (req.session.user.role == 'Doctor') {
            return res.redirect('/doctor/dashboard');
        } else if (req.session.user.role == 'Driver') {
            return res.redirect('/driver/dashboard');
        } else if (req.session.user.role == 'Client') {
            return res.redirect('/client/dashboard');
        } else if (req.session.user.role == 'CallCenter') {
            return res.redirect('/callcenter/dashboard');
        } else if (req.session.user.role == 'Pharmacy') {
            return res.redirect('/pharmacy/dashboard');
        } else {
            let v;
            v = new View(res, 'backend/dashboard/index');

            let doctorsCount = await UserModel.countDocuments({role:'Doctor', isDoneProfile: true});
            let companyCount = await UserModel.countDocuments({role:'Company', isDoneProfile: true});
            let pharmacyCount = await UserModel.countDocuments({role:'Pharmacy', isDoneProfile: true});
            let ordersCount = await OrderModel.countDocuments({status:'Closed'});

            let clients = await UserModel.find({role:'Client', isDoneProfile: true});


            let dt = new Date();
            dt.setMonth(0)
            dt.setDate(0);
            dt.setUTCHours(0,0,0,0);
            let closedOrders = await OrderModel.find({status:'Closed', closedAt: {$gte: dt}});

            let closedOrderGraphData = await this.getClosedOrderGraphData(closedOrders);
            let clientGraphData = await this.clientGraphData(clients);

            let doctors = await UserModel.find({role:'Doctor', isDoneProfile: true}).sort({createdAt: -1});

            dt = new Date(); // Today Clients
            dt.setDate(dt.getDate() - 3);
            dt.setUTCHours(0,0,0,0); // Today time

            let newClients = await UserModel.find({role:'Client', createdAt: {$gte: dt}}).sort({createdAt : -1});
            // let newClients = await UserModel.find({role:'Client'}).sort({createdAt : -1});

            v.render({
                title: 'Dashboard',
                session: req.session,
                doctorsCount: doctorsCount,
                companyCount: companyCount,
                pharmacyCount: pharmacyCount,
                ordersCount: ordersCount,
                commGraphData: closedOrderGraphData,
                clientGraphData: clientGraphData,
                doctors: doctors,
                newClients: newClients,
            });
        }

    },
    getClosedOrderGraphData: async function (closedOrders) {
        let graphData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; //Total 12 Month
        let i;
        for (i = 0; i < closedOrders.length; i++) {
            let month = new Date(closedOrders[i].closedAt).getMonth();
            graphData[month]++;
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
});
