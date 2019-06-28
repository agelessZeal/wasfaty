/**
 * Middleware to check User Token Validation
 */
let config  = require('../config/index');
let UserModel = require('../models/user');

exports.logCheck = function (req,res,next) {
    let d = new Date();
    if(config.isEnableLog) {
        // let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        console.log(`LOG===>[ ${d.toISOString()} ], ${req.method}, IP:${getClientIp(req)}, ${req.originalUrl}`);
        if (req.session.user){
            console.log(`======>Logged User: ${req.session.user.email}`);
        }
        if (req.method == 'POST') {
            console.log(req.body);
        }
    }
    next();
};

/**
 * Return Client IP and UserAgent from request
 * @param req
 * @returns {string}
 */
function getClientIp(req) {
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
    if (config.isUALog){
        return  `IP:${ipAddress}, Agent:${uAg}`;
    } else {
        return  ipAddress;
    }
}
