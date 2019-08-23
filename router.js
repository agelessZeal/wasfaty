let express, router, config;
let home_controller, dashboard_controller,
    error_controller, auth_controller;

let salesman_controller, company_controller, pharmacy_controller, client_controller,
    doctor_controller, driver_controller, call_center_controller, invite_controller, user_controller;
let ins_controller, spec_controller, country_controller, mi_controller, item_controller;

let order_controller;

express = require('express');
router = express.Router();
config = require('./config/index');

error_controller = require('./controllers/ErrorController');
auth_controller = require('./controllers/AuthController');
home_controller = require('./controllers/HomeController');
dashboard_controller = require('./controllers/DashboardController');

user_controller = require('./controllers/UserController');
salesman_controller = require('./controllers/SalesmanController');
client_controller = require('./controllers/ClientController');
company_controller = require('./controllers/CompanyController');
pharmacy_controller = require('./controllers/PharmacyController');
doctor_controller = require('./controllers/DoctorController');
driver_controller = require('./controllers/DriverController');
call_center_controller = require('./controllers/CallCenterController');
invite_controller = require('./controllers/InviteController');
ins_controller = require('./controllers/InsuranceController');
spec_controller = require('./controllers/SpecialistController');
mi_controller = require('./controllers/MasterItemController');
item_controller = require('./controllers/ItemController');
country_controller = require('./controllers/CountryController');
order_controller = require('./controllers/OrderController');
/**
 * Frontend Routers
 */
//////////////////////////////////////Site map/////////////////////////////
router.get('/', function (req, res) {
    home_controller.index(req, res);
});

router.get('/product', function (req, res) {
    home_controller.showProducts(req, res);
});

router.post('/product/search/product', function (req, res) {
    home_controller.searchProducts(req, res);
});

router.get('/dashboard', function (req, res) {
    dashboard_controller.index(req, res);
});

router.get('/company/dashboard', function (req, res) {
    company_controller.showDashboard(req, res);
});

router.get('/company/reports', function (req, res) {
    company_controller.showCompanyReports(req, res);
});

router.get('/company/doctor', function (req, res) {
    company_controller.showCompanyDoctors(req, res);
});

router.get('/company/salesman', function (req, res) {
    company_controller.showCompanySalesman(req, res);
});

router.get('/doctor/dashboard', function (req, res) {
    doctor_controller.showDashboard(req, res);
});
router.get('/salesman/dashboard', function (req, res) {
    salesman_controller.showDashboard(req, res);
});

router.get('/salesman/orders', function (req, res) {
    salesman_controller.showMyOrders(req, res);
});

router.get('/salesman/reports', function (req, res) {
    salesman_controller.showMyOrderReports(req, res);
});

router.get('/driver/dashboard', function (req, res) {
    driver_controller.showDashboard(req, res);
});
router.get('/pharmacy/dashboard', function (req, res) {
    pharmacy_controller.showDashboard(req, res);
});
router.get('/callcenter/dashboard', function (req, res) {
    call_center_controller.showDashboard(req, res);
});
router.get('/client/dashboard', function (req, res) {
    client_controller.showDashboard(req, res);
});
router.get('/client/doctors', function (req, res) {
    client_controller.showMyDoctors(req, res);
});

/******************************************************************
 *                  Admin Routers                                 /
 ******************************************************************/

router.get('/pharmacy/orders', function (req, res) {
    pharmacy_controller.showMyOrders(req, res);
});

router.get('/pharmacy/reports', function (req, res) {
    pharmacy_controller.showMyOrderReports(req, res);
});

router.get('/pharmacy/orders/view/:orderId', function (req, res) {
    pharmacy_controller.viewOrderDetail(req, res);
});

router.post('/pharmacy/orders-item/update', function (req, res) {
    pharmacy_controller.updateSingleOrderItem(req, res);
});

router.get('/driver/orders', function (req, res) {
    driver_controller.showMyOrders(req, res);
});

router.get('/driver/reports', function (req, res) {
    driver_controller.showMyOrderReports(req, res);
});

router.get('/driver/orders/view/:orderId', function (req, res) {
    driver_controller.viewOrderDetail(req, res);
});

router.get('/insurance/delete/:ins_type/:id', function (req, res) {
    ins_controller.deleteInsItem(req, res);
});

router.get('/specialist/delete/:id', function (req, res) {
    spec_controller.deleteSpecItem(req, res);
});


//=============================================================
router.get('/item/delete/:id', function (req, res) {
    item_controller.deleteItem(req, res);
});

router.post('/item/upload_picture', function (req, res) {
    item_controller.uploadItemImage(req, res);
});

router.get('/master-item/delete/:mtType/:id', function (req, res) {
    mi_controller.deleteMasterItem(req, res);
});

router.get('/master-item/:mtType', function (req, res) {
    mi_controller.showMasterItems(req, res)
});

router.get('/master-item/update/:mtType/:op', function (req, res) {
    mi_controller.showAddMasterItems(req, res);
});

router.post('/master-item/update/:mtType/:op', function (req, res) {
    mi_controller.updateMasterItems(req, res);
});

router.get('/country/list', function (req, res) {
    country_controller.showItems(req, res)
});

router.get('/country/update/:op', function (req, res) {
    country_controller.showAddItems(req, res);
});

router.get('/country/delete/:id', function (req, res) {
    country_controller.deleteItem(req, res);
});

router.post('/country/update/:op', function (req, res) {
    country_controller.updateItems(req, res);
});

router.get('/client/orders', function (req, res) {
    client_controller.showOrders(req, res);
});

router.get('/client/reports', function (req, res) {
    client_controller.showOrderReports(req, res);
});

router.get('/client/my-invitation', function (req, res) {
    client_controller.showInviteList(req, res);
});
router.get('/client/item', function (req, res) {
    client_controller.showItems(req, res)
});
/******************************************************************
 *                  Salesman Router                                  /
 ******************************************************************/

router.get('/salesman/doctor/list', function (req, res) {
    salesman_controller.showDoctorList(req, res);
});

router.get('/salesman/invite/add', function (req, res) {
    salesman_controller.addInvite(req, res);
});

/******************************************************************
 *                  Doctor Router                                  /
 ******************************************************************/
router.get('/doctor/my-invitation', function (req, res) {
    doctor_controller.showInviteList(req, res);
});
router.get('/doctor/clients', function (req, res) {
    doctor_controller.showClients(req, res);
});
router.get('/doctor/reports', function (req, res) {
    doctor_controller.showMyOrderReports(req, res);
});

//===================API==========================================
router.get('/api/user/:userType', function (req, res) {
    user_controller.getUsers(req, res);
});
router.get('/api/report/:userType', function (req, res) {
    user_controller.getReportUsers(req, res);
});
router.get('/api/location', function (req, res) {
    user_controller.getLocation(req, res);
});

router.use('/auth', require('./routes/auth'));
router.use('/admin', require('./routes/admin'));
router.use('/callcenter', require('./routes/call_center'));
router.use('/orders', require('./routes/order'));
router.use('/users', require('./routes/user'));
router.use('/invite', require('./routes/invite'));
router.use('/message', require('./routes/message'));
router.use('/announcement', require('./routes/announcement'));

router.get('*', function (req, res) {
    error_controller.show_404(req, res);
});

module.exports = router;
