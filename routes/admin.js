let express, router, config;
let salesman_controller, company_controller, pharmacy_controller,client_controller,
    doctor_controller,driver_controller,call_center_controller, invite_controller, user_controller;
let ins_controller, spec_controller, mi_controller, item_controller;

let setting_controller, order_controller;

express = require('express');
router = express.Router();
config = require('../config/index');

user_controller = require('../controllers/UserController');
item_controller = require('../controllers/ItemController');
ins_controller = require('../controllers/InsuranceController');
spec_controller = require('../controllers/SpecialistController');
mi_controller = require('../controllers/MasterItemController');
invite_controller = require('../controllers/InviteController');
doctor_controller = require('../controllers/DoctorController');
call_center_controller = require('../controllers/CallCenterController');
salesman_controller = require('../controllers/SalesmanController');
client_controller = require('../controllers/ClientController');
company_controller = require('../controllers/CompanyController');
pharmacy_controller = require('../controllers/PharmacyController');
doctor_controller = require('../controllers/DoctorController');
driver_controller = require('../controllers/DriverController');
setting_controller = require('../controllers/SettingController');
order_controller = require('../controllers/OrderController');
/**
 * Admin Routes
 */

router.get('/closed-orders', function (req, res) {
    order_controller.adminClosedOrders(req, res)
});

router.get('/item', function (req, res) {
    item_controller.showItems(req, res)
});

router.get('/reports', function (req, res) {
    order_controller.showAdminReports(req, res);
});

router.get('/commission-stat', function (req, res) {
    order_controller.showCommissionStat(req, res);
});

router.get('/specialist', function (req, res) {
    spec_controller.showSpecItems(req, res)
});

router.get('/callcenter', function (req, res) {
    call_center_controller.list(req, res);
});

router.get('/doctor', function (req, res) {
    doctor_controller.list(req, res);
});

router.get('/client', function (req, res) {
    client_controller.list(req, res);
});

router.get('/driver', function (req, res) {
    driver_controller.list(req, res);
});

router.get('/salesman', function (req, res) {
    salesman_controller.list(req, res);
});

router.get('/company', function (req, res) {
    company_controller.list(req, res);
});

router.get('/pharmacy', function (req, res) {
    pharmacy_controller.list(req, res);
});

router.post('/insurance/:op/:ins_type', function (req, res) {
    ins_controller.updateInsItems(req, res);
});

router.get('/specialist/:op', function (req, res) {
    spec_controller.showAddSpecItems(req, res);
});

router.get('/item/:op', function (req, res) {
    item_controller.showAddItems(req, res);
});

router.post('/item/:op', function (req, res) {
    item_controller.updateItems(req, res);
});


router.post('/specialist/:op', function (req, res) {
    spec_controller.updateSpecItems(req, res);
});

router.get('/member/add', function (req, res) {
    invite_controller.addUser(req, res)
});

router.get('/callcenter/add', function (req, res) {
    call_center_controller.add(req, res);
});

router.post('/callcenter/add', function (req, res) {
    call_center_controller.addCallCenter(req, res);
});

router.get('/insurance/:ins_type', function (req, res) {
    ins_controller.showInsItems(req, res)
});

router.get('/insurance/:op/:ins_type', function (req, res) {
    ins_controller.showAddInsItems(req, res);
});

router.get('/setting/commissions', function (req, res) {
    setting_controller.showCommissions(req, res);
});

router.post('/setting/commission/update', function (req, res) {
    setting_controller.updateCommissions(req, res);
});

router.get('/setting/driver-fee', function (req, res) {
    setting_controller.showDriverFee(req, res);
});

router.post('/setting/driver-fee/update', function (req, res) {
    setting_controller.updateDriverFee(req, res);
});

router.get('/setting/loyalty-point', function (req, res) {
    setting_controller.showLoyaltyPoint(req, res);
});

router.post('/setting/loyalty-point/update', function (req, res) {
    setting_controller.updateLoyaltyPoint(req, res);
});

module.exports = router;
