let async, mongoose, config;
let menuConfig;
async = require('async');
mongoose = require('mongoose');
config = require('../config/index');
menuConfig = require('../config/menu');

module.exports = function (response, template) {
    this.response = response;
    this.template = template;
};

module.exports.prototype = {
    extend: function (properties) {
        var Child = module.exports;
        Child.prototype = module.exports.prototype;
        for (var key in properties) {
            Child.prototype[key] = properties[key];
        }
        return Child;
    },
    render: async function (data) {
        if (this.response && this.template) {

            data.siteDomain = config.info.domain;
            data.wsPort = config.ws_port;
            data.menu = menuConfig;
            data.config = config;
            data.i18n = this.response;

            this.response.render(this.template, data);
        }
    },
    checkLogin: function (session) {
        if( typeof session.login != "undefined"){
            return session.login;
        }else{
            return false;
        }
    },
};
