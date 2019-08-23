/**
 * Module dependencies.
 */
let express, http, fileUpload, cookieParser, session,
    mongoose, bodyParser, methodOverride, cmd, https, WebSocket,
    app, route, d, config, url, flash, path, schedule;

let logChecker; // Middleware for log checking

let i18n;

let call_center;

express = require('express');
http = require('http');
https = require('https');
url = require('url');
path = require('path');
session = require('express-session');
flash = require('connect-flash');
fileUpload = require('express-fileupload');
mongoose = require('mongoose');
bodyParser = require('body-parser');
methodOverride = require('method-override');
cookieParser = require('cookie-parser');
schedule = require('node-schedule');
call_center = require('./controllers/CallCenterController');
cmd = require('node-cmd');
WebSocket = require('ws');
app = express();

let mi_controller = require('./controllers/MasterItemController');

logChecker = require('./middleware/log_checker');

// Multi language middleware ,
// https://www.npmjs.com/package/i18n
// https://medium.com/@markocen/i18n-for-node-application-4b8180b803e
i18n = require("i18n");
i18n.configure({
    locales: ['ar', 'en'],
    directory: __dirname + '/locales',
    defaultLocale: 'ar',
    cookie: 'i18n',
    register: global
});

route = require('./router.js');
config = require('./config/index');
d = new Date();

// all environments

global.__basedir = __dirname;

// app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.enable("trust proxy"); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(session({
    secret: "OzhclfxGp956SMjtq",
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 5},///This is expire time is 5days
    resave: true,
    saveUninitialized: true,
}));
// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(bodyParser.json({type: 'application/vnd.api+json'})); // parse application/vnd.api+json as json
app.use(methodOverride('X-HTTP-Method-Override')); // override with the X-HTTP-Method-Override header in the request
// use connect-flash for flash messages stored in session
app.use(flash());
app.use(fileUpload());

app.use(i18n.init);
app.get('/lang/:lang', function (req, res) {
    res.cookie('i18n', req.params.lang);
    let bkurl = req.headers.referer || '/';
    res.redirect(bkurl)
});

app.use(logChecker.logCheck);

require('./ws'); // Start Websocket server.....

// schedule.scheduleJob('*/1 * * * *', function () { //Every 1 mins
//     console.log(new Date(), '----------------Checking Pending Driver Orders--------------------');
//     call_center.checkPendingDeliveryOrders();
// });


schedule.scheduleJob('0 0 1 * *', function () { //Every Month Schedule
    console.log(new Date(), '----------------Initializing Group Search Count--------------------');
    console.log('Your scheduled job at beginning of month');
});

let mongoDB = "mongodb://" + config.mongo.host + ':' + config.mongo.port + '/' + config.mongo.dbname;
mongoose.connect(mongoDB, {useNewUrlParser: true},
    function (err, db) {
        if (err) {
            console.log(mongoDB);
            console.log('[' + d.toLocaleString() + '] ' + 'Sorry, there is no mongo db server running.');
        } else {
            let attachDB = function (req, res, next) {
                req.db = db;
                next();
            };
            app.use('/', attachDB, route);
            http.createServer(app).listen(config.port, function () {
                console.log('[' + d.toLocaleString() + '] ' + 'Express server listening on http://127.0.0.1:' + config.port);
            });
        }
    });
