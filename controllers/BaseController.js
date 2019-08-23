let _, config, _ld, qs, fs, async;

let UserModel, ItemModel;

_ = require("underscore");
config = require('../config/index');
crypto = require("crypto");
async = require("async");

_ld = require('lodash');
qs = require('qs');
fs = require('fs');

ItemModel = require("../models/item");

module.exports = {
    name: "BaseController",
    extend: function (child) {
        return _.extend({}, this, child);
    },
    run: function (req, res, next) {
    },

    isLogin: function (req) {
        if (typeof req.session.login != "undefined") {
            return req.session.login;
        } else {
            return false;
        }
    },
    makeID: function (prefix = "", length = 10) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return (prefix + text);
    },
    getClientIp: function (req) {
        let uAg = req.headers['user-agent'];
        let ipAddress = req.connection.remoteAddress;
        if (req.headers['x-forwarded-for'] != undefined) {
            ipAddress = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress;
        }
        ipAddress = ipAddress.split(',')[0];
        if (ipAddress.substr(0, 1) == ':') ipAddress = ipAddress.substr(7);
        return ipAddress;
    },
    getCurDate: function () {
        let severDt = new Date();
        let localDt = new Date(severDt.getTime() + config.tz);
        return new Date(localDt.toDateString());
    },
    isEmail: function (email) {
        let emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
        return emailRegex.test(email);
    },
    isURL: function (str) {
        let regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
        return regexp.test(str);
    },
    onlyUnique: function (value, index, self) {
        return self.indexOf(value) === index;
    },
    checkSpecialStr: function (str) {
        let strFormat = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        return strFormat.test(str);
    },
    validatePassord: function (password) {
        /*
        /^
        (?=.*\d)          // should contain at least one digit
        (?=.*[a-z])       // should contain at least one lower case
        (?=.*[A-Z])       // should contain at least one upper case
        [a-zA-Z0-9]{8,}   // should contain at least 8 from the mentioned characters
        $/
        */
        return password.match(/^(?=.*[a-z])(?=.*[A-Z])([a-zA-Z0-9]{8})$/);
    },

    getRandomColor() {
        let letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    },

    uploadAvatar: async function (req, res) {
        let upload_file, fn, ext, dest_fn;
        upload_file = req.files.file;
        fn = upload_file.name;
        ext = fn.substr(fn.lastIndexOf('.') + 1).toLowerCase();
        if (ext == 'blob') ext = 'png';
        dest_fn = this.makeID('avatar_', 10) + "." + ext;
        upload_file.mv('public/uploads/avatar/' + dest_fn, async function (err) {
            if (err) {
                console.log('File Uploading Error');
                console.log(err);
                return res.send({status: 'fail', data: 'Avatar Image Uploading Error'});
            }
            return res.send({status: 'success', data: '/uploads/avatar/' + dest_fn});
        });
    },
    getDate: function (dt) {
        let fYear = dt.getFullYear();
        let fMonth = dt.getMonth() + 1;
        if (fMonth < 10) {
            fMonth = '0' + fMonth;
        }
        // Day part from the timestamp
        let day = dt.getDate();
        if (day < 10) {
            day = '0' + day;
        }
        return fYear + "-" + fMonth + "-" + day;
    },
    getTs: function () {
        return Math.round((new Date()).getTime() / 1000);
    },
};
