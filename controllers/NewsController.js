let _, async, mongoose, BaseController, View, path;
let config, axios, request, fs, ejs;
let UserModel, countryList, NewsModel;

async = require("async");
mongoose = require('mongoose');
axios = require('axios');
path = require('path');
config = require('../config/index');
fs = require('fs');
ejs = require('ejs');

countryList = require('../config/country');

UserModel = require('../models/user');
NewsModel = require('../models/news');

BaseController = require('./BaseController');
View = require('../views/base');
request = require('request');

module.exports = BaseController.extend({
    name: 'NewsController',
    listNews: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let news_list = await NewsModel.find();
        v = new View(res, 'backend/news/index');
        v.render({
            title: 'Announcement',
            session: req.session,
            news_list: news_list,
            filter: req.query
        });
    },

    addNews: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        v = new View(res, 'backend/news/edit');
        v.render({
            title: 'Add News',
            session: req.session,
            pg_type: true,
            error: req.flash("error"),
            success: req.flash("success"),
        });
    },

    editNews: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let newsId = req.params.newsId;
        let newsInfo = await NewsModel.findOne({_id: newsId});
        if (newsInfo != null) {
            v = new View(res, 'backend/news/edit');
            v.render({
                title: 'Edit News',
                session: req.session,
                pg_type: false, // True => add mode, False => edit mode
                news_info: newsInfo,
                error: req.flash("error"),
                success: req.flash("success"),
            });
        } else {
            return res.redirect('/*')
        }
    },
    updateNews: async function (req, res) {
        let v;
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        let newsId = req.query.newsId;
        let rq = req.body;
        let backURL = (newsId)? '/admin/news/edit/' + newsId : '/admin/news/add';
        //Validation
        if( !rq.title) {
            req.flash('error', 'Empty title');
            return res.redirect(backURL);
        }
        if (newsId) { // Edit mode
            let newsInfo = await NewsModel.findOne({_id: newsId});
            if (newsInfo) {
                newsInfo.title = rq.title;
                newsInfo.description = rq.description;
                newsInfo.attachments = JSON.parse(rq.attachments);
                await newsInfo.save();
                req.flash('success', 'News record updated successfully');
                return res.redirect(backURL);
            } else {
                return res.redirect('/*');
            }
        } else { // Add mode
            let newsId = this.makeID('N', '5');
            await NewsModel.collection.insertOne({
                newsId: newsId,
                title: rq.title,
                description: rq.description,
                attachments: JSON.parse(rq.attachments),
                createdAt: new Date(),
            });
            req.flash('success', 'News record added successfully');
            return res.redirect(backURL);
        }
    },
    deleteNews: async function (req, res) {
        if (!this.isLogin(req)) {
            return res.redirect('/auth/login');
        }
        let newsId = req.params.newsId;
        let newsInfo = await NewsModel.findOne({_id: newsId});
        if (req.session.user.role != 'Admin') {
            return res.redirect('/*');
        }
        if (newsInfo != null) {
            await newsInfo.remove();
        }
        return res.redirect('/admin/news');
    },
    uploadAttachment: async function (req, res) {
        let upload_file, fn, ext, dest_fn;
        upload_file = req.files.file;
        fn = upload_file.name;
        ext = fn.substr(fn.lastIndexOf('.') + 1).toLowerCase();
        if (ext == 'blob') ext = 'png';
        dest_fn = this.makeID('attachment_', 10) + "." + ext;
        upload_file.mv('public/uploads/attachments/' + dest_fn, async function (err) {
            if (err) {
                console.log('File Uploading Error');
                console.log(err);
                return res.send({status: 'fail', data: 'File Uploading Error'});
            }
            return res.send({status: 'success', data: {fn: fn, path: '/uploads/attachments/' + dest_fn}});
        });
    },
});
