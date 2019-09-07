let _, async, mongoose, BaseController;
let config, axios, request, fs, ejs, crypto, nodemailer, transporter, View;
let UserModel, countryList;

let OrderModel, OrderStatusModel;
let InsCompanyModel, InsTypeModel, InsGradeModel;

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
UserModel = require('../models/user');
countryList = require('../config/country');

OrderModel = require('../models/order');
OrderStatusModel = require('../models/orderStatus');
OrderItemHistModel = require('../models/OrderItemHistory');

InsCompanyModel = require('../models/insuranceCompany');
InsTypeModel = require('../models/insuranceType');
InsGradeModel = require('../models/insuranceGrade');

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
    name: 'PharmacyController',
    showDashboard: async function(req, res) {
        if(!this.isLogin(req)){
            req.session.redirectTo = '/pharmacy/dashboard';
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Pharmacy') {
            return res.redirect('/*');
        }
        if(!req.session.user.isDoneProfile) {
            return res.redirect('/invite/profile/info');
        }

        let v;
        v = new View(res, 'backend/pharmacy/dashboard');

        let dt = new Date();
        dt.setUTCHours(0,0,0,0); // Today time

        let todayClosedOrders = await OrderItemHistModel.find({orderDate: {$gte: dt}, email: req.session.user.email});
        let todayCommissions = 0, i;
        for (i = 0; i < todayClosedOrders.length; i++) {
            todayCommissions += Number(todayClosedOrders[i].commAmount);
        }
        todayCommissions = Number(todayCommissions.toFixed(2));

        let orderHistData = await OrderStatusModel.find({phInfoId: req.session.user._id.toString(), orderType: {$in: ["DriverClosed", "PhClosed"]}});
        let orderIds = orderHistData.map((ohdItem) => ohdItem.orderId);

        let todayOrders = await OrderModel.countDocuments({createdAt: {$gte: dt}, orderId: {$in: orderIds}});

        dt.setDate(1);
        let monthClosedOrders = await OrderItemHistModel.find({orderDate: {$gte: dt}, email: req.session.user.email});
        let monthCommissions = 0;
        for (i = 0; i < monthClosedOrders.length; i++) {
            monthCommissions += Number(monthClosedOrders[i].commAmount);
        }
        monthCommissions = Number(monthCommissions.toFixed(2));
        // Pharmacy Clients
        let allPharmacyOrders = await OrderModel.find({orderId: {$in: orderIds}});
        let allClientEmails = allPharmacyOrders.map((aPItem) => aPItem.clientEmail);

        let clients = await UserModel.find({role:'Client', isDoneProfile: true, email: {$in: allClientEmails}});
        let clientGraphData = await this.clientGraphData(clients);
        let commGraphData = await this.commissionGraphData(req.session.user.email);

        /////////////////////////////////////////////////
        // Search filters
        let toDate;
        let dtQuery = {$gte: "2010-01-01"};
        if (req.query.toDate) {
            toDate = new Date(req.query.toDate);
            toDate.setUTCHours(23, 59,0,0);
            dtQuery['$lte'] = toDate;
        }

        let orders, orderStatusObjList = {};
        let myOrderIds = [];
        let orderStatusList = await OrderStatusModel.find({phId: req.session.user._id}).sort({updatedAt:-1});

        console.log('----------------Pharmacy showMyOrders-------------------------------------');
        //console.log(orderStatusList);
        orderStatusList.forEach(function(item) {
            if (myOrderIds.indexOf(item.orderId)<0) {
                myOrderIds.push(item.orderId);
            }
        });

        orders = await OrderModel.find({orderId: {$in: myOrderIds}, status:{$ne:'Closed'}, createdAt: dtQuery});
        orderStatusList.forEach(function(item) {
            let orderid = item.orderId.toString();
            if (!orderStatusObjList.hasOwnProperty(orderid)) {
                orderStatusObjList[orderid] =  item;
            }
        });

        console.log('Show orders.............', orderStatusList.length);
        /////////////////////////////////////////////////
        let marketIndicator = await this.getPerformance(req.session.user.email);

        v.render({
            title: 'Dashboard',
            session: req.session,
            todayCommission: todayCommissions,
            monthCommission: monthCommissions,
            todayOrders: todayOrders,
            clientCount: clients.length,
            commGraphData: commGraphData,
            clientGraphData: clientGraphData,
            data_list: orders,
            marketIndicator: marketIndicator
        });
    },

    commissionGraphData: async function (pharmacyEmail) {

        let dt = new Date();
        dt.setMonth(0)
        dt.setDate(0);
        dt.setUTCHours(0,0,0,0);

        let commHistData = await OrderItemHistModel.find({email: pharmacyEmail, orderDate: {$gte: dt}});

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

    showDoctorReports: async function (req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/pharmacy/doctor/reports';
            return res.redirect('/auth/login');
        }

        if (req.session.user.role != "Pharmacy") {
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
            toDate.setUTCHours(23, 59, 0, 0);
            dtQuery['$lte'] = toDate;
        }


        let items = await ItemModel.find();
        let itemObj = {};
        for (let i = 0; i < items.length; i++) {
            itemObj[items[i].itemId] = items[i];
        }

        let searchQuery = {};
        searchQuery.email = req.session.user.email;
        searchQuery.orderDate = dtQuery;

        let orderItemHist = await OrderItemHistModel.find(searchQuery).sort({orderDate: -1});

        // get pharmacy Order Id List
        let pharmacyOrderIdList = [];
        pharmacyOrderIdList = orderItemHist.map((oih) => oih.orderId);
        pharmacyOrderIdList = pharmacyOrderIdList.filter(this.onlyUnique);

        // userEmailList : doctor email......
        let doctorEmailList = [], i;
        for (i = 0; i<orderItemHist.length; i++) {
            let orderInfo = await OrderModel.findOne({orderId: orderItemHist[i].orderId});
            if (orderInfo) {
                doctorEmailList.push(orderInfo.doctorEmail);
            }
        }

        doctorEmailList = doctorEmailList.filter(this.onlyUnique);
        let doctorOrderHist = await OrderItemHistModel.find({email: {$in: doctorEmailList}, orderId: {$in: pharmacyOrderIdList}}).sort({createdAt: -1});

        let v = new View(res, 'backend/pharmacy/doctor-reports');
        v.render({
            title: 'Doctor Order Reports',
            session: req.session,
            data_list: doctorOrderHist,
            itemObj: itemObj,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            userEmail: req.query.e,
            doctorEmailList: doctorEmailList
        });
    },

    // This function is used for the doctor commission data
    showCommissionStat: async function (req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/pharmacy/doctor/commission-stat';
            return res.redirect('/auth/login');
        }

        if (req.session.user.role != "Pharmacy") {
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
            toDate.setUTCHours(23, 59, 0, 0);
            dtQuery['$lte'] = toDate;
        }


        let items = await ItemModel.find();
        let itemObj = {};
        for (let i = 0; i < items.length; i++) {
            itemObj[items[i].itemId] = items[i];
        }

        let searchQuery = {};

        if (typeof req.query.e == 'undefined') {
            req.query.e = 'All';
        }

        searchQuery.email = req.session.user.email;
        searchQuery.orderDate = dtQuery;

        let orderItemHist = await OrderItemHistModel.find(searchQuery).sort({orderDate: -1});

        // get pharmacy Order Id List
        let pharmacyOrderIdList = [];
        pharmacyOrderIdList = orderItemHist.map((oih) => oih.orderId);
        pharmacyOrderIdList = pharmacyOrderIdList.filter(this.onlyUnique);

        // userEmailList : doctor email......
        let doctorEmailList = [], i;
        for (i = 0; i<orderItemHist.length; i++) {
            let orderInfo = await OrderModel.findOne({orderId: orderItemHist[i].orderId});
            if (orderInfo) {
                doctorEmailList.push(orderInfo.doctorEmail);
            }
        }

        doctorEmailList = doctorEmailList.filter(this.onlyUnique);

        let userCommRecs = [];
        for (let userIdx = 0; userIdx < doctorEmailList.length; userIdx++) {

            let userType = '', userInfo;
            userInfo = await UserModel.findOne({email: doctorEmailList[userIdx]});
            if (userInfo != null) {
                userType = userInfo.role;
            }

            if (userInfo) {
                let userOrderItemRecords = await OrderItemHistModel.find({email: userInfo.email , orderId: {$in: pharmacyOrderIdList}});
                let totalOrderAmount = 0;
                let userCommAmount = 0;
                let orderIdList = [];
                for (i = 0; i < userOrderItemRecords.length; i++) {
                    if (orderIdList.indexOf(userOrderItemRecords[i].orderId) < 0) {
                        orderIdList.push(userOrderItemRecords[i].orderId);
                    }
                    totalOrderAmount += userOrderItemRecords[i].totalAmount; // total order Amount
                    userCommAmount += userOrderItemRecords[i].commAmount;
                }
                userCommRecs.push({
                    email: doctorEmailList[userIdx],
                    userType: 'Doctor',
                    orderCount: orderIdList.length,
                    totalOrderAmount: totalOrderAmount,
                    userCommAmount: userCommAmount
                })
            }
        }

        let v = new View(res, 'backend/pharmacy/commission-stat');
        v.render({
            title: 'Commission statistics',
            session: req.session,
            data_list: userCommRecs,
            itemObj: itemObj,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            userEmail: req.query.e,
            doctorEmailList: doctorEmailList
        });
    },

    list: async function (req, res) {
        let v, users;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/admin/pharmacy';
            return res.redirect('/auth/login');
        }
        if(req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        users = await UserModel.find({role: 'Pharmacy'});

        let companyUsers = await UserModel.find({role:'Company'});
        let companyObj = {};
        for ( let i = 0; i < companyUsers.length; i++) {
            companyObj[companyUsers[i]._id] = companyUsers[i];
        }

        v = new View(res, 'backend/pharmacy/list');
        v.render({
            title: 'Pharmacy List',
            session: req.session,
            users: users,
            companyObj:companyObj
        });
    },

    showMyOrders: async function(req, res) {
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/pharmacy/orders';
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
            toDate.setUTCHours(23, 59,0,0);
            dtQuery['$lte'] = toDate;
        }

        let v, orders, orderStatusObjList = {};
        let orderIds = [];
        let orderStatusList = await OrderStatusModel.find({phId: req.session.user._id}).sort({updatedAt:-1});

        console.log('----------------Pharmacy showMyOrders-------------------------------------');
        //console.log(orderStatusList);
        orderStatusList.forEach(function(item) {
            if (orderIds.indexOf(item.orderId)<0) {
                orderIds.push(item.orderId);
            }
        });

        orders = await OrderModel.find({orderId: {$in: orderIds}, status:{$ne:'Closed'}, createdAt: dtQuery});
        orderStatusList.forEach(function(item) {
            let orderid = item.orderId.toString();
            if (!orderStatusObjList.hasOwnProperty(orderid)) {
                orderStatusObjList[orderid] =  item;
            }
        });

        console.log('Show orders.............', orderStatusList.length);
        v = new View(res, 'backend/pharmacy/my-orders');
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

        if (req.session.user.role != "Pharmacy") {
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

        let v = new View(res, 'backend/pharmacy/my-reports');
        v.render({
            title: 'My Reports',
            session: req.session,
            data_list: orderItemHist,
            itemObj: itemObj,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate
        });
    },

    viewOrderDetail: async function(req, res) {
        let v, orderInfo, orderId, orderStInfo, orderPhInfo;
        orderId = req.params.orderId;
        if (!this.isLogin(req)) {
            req.session.redirectTo = '/pharmacy/orders/view/' + orderId;
            return res.redirect('/auth/login');
        }

        orderInfo = await OrderModel.findOne({orderId: orderId});

        orderStInfo = await OrderStatusModel.findOne({orderId: orderId, driverId:""}).sort({updatedAt: -1});
        console.log('====viewOrder====');
        console.log(orderStInfo);

        if (orderInfo) {
            let ins_companies = await InsCompanyModel.find().sort({name: 1});
            let ins_grades = await InsGradeModel.find().sort({name: 1});
            let ins_types = await InsTypeModel.find().sort({name: 1});

            if (orderStInfo) {
                orderPhInfo = await UserModel.findOne({_id: orderStInfo.phId});
            }

            for (let i = 0; i<orderInfo.items.length; i++) {
                console.log('----------------------------------------', orderInfo.items[i].code);
                let itemInfo = await ItemModel.findOne({itemId: orderInfo.items[i].code});
                orderInfo.items[i].description_en = itemInfo.description_en;
                orderInfo.items[i].description_ar = itemInfo.description_ar;
                orderInfo.items[i].picture = itemInfo.pic;
            }

            console.log("Current Order Info==========>", orderInfo);

            v = new View(res, 'backend/pharmacy/order-view');
            v.render({
                title: 'Orders',
                session: req.session,
                orderInfo: orderInfo,
                orderStInfo: orderStInfo,
                orderPhInfo: orderPhInfo,
                ins_companies: ins_companies,
                ins_grades: ins_grades,
                ins_types: ins_types,
            });
        } else {
            return res.redirect('/*');
        }
    },
    updateSingleOrderItem: async function(req, res) {
        let ret = {status:'fail', data:''}, orderInfo,
            orderId = req.body.orderId,
            itemOrder = req.body.itemOrder,
            itemSt = req.body.st;

        if (!this.isLogin(req)) {
            ret.data = "Please Login";
            return res.json(ret);
        }

        orderInfo = await OrderModel.findOne({orderId: orderId});
        if (!orderInfo) {
            ret.data = "Invalid Order";
            return res.json(ret);
        }
        console.log('====================================');
        console.log(orderInfo.items[itemOrder]);
        orderInfo.items[itemOrder].status = itemSt;
        await OrderModel.updateOne({orderId: orderId}, {items: orderInfo.items});
        ret.data = 'success';
        ret.status = "success";
        return res.json(ret);
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

        console.log(totalAmount, myOrderAmount, '===============Pharmacy Order Data=====================');

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
