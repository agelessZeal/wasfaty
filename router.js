let express, router, config;
let home_controller,dashboard_controller,
    error_controller, auth_controller,news_controller;

let salesman_controller, company_controller, pharmacy_controller,client_controller,
    doctor_controller,driver_controller,call_center_controller, invite_controller, user_controller;
let ins_controller, spec_controller, country_controller, mi_controller, item_controller;

let order_controller;

express = require('express');
router = express.Router();
config = require('./config/index');

error_controller = require('./controllers/ErrorController');
auth_controller = require('./controllers/AuthController');
home_controller = require('./controllers/HomeController');
dashboard_controller = require('./controllers/DashboardController');
news_controller = require('./controllers/NewsController');

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

order_controller =  require('./controllers/OrderController');
/**
 * Frontend Routers
 */
//////////////////////////////////////Site map/////////////////////////////
router.get('/', function (req, res) {
    home_controller.index(req, res);
});

router.get('/dashboard', function (req, res) {
    dashboard_controller.index(req, res);
});

/******************************************************************
 *                  Admin Routers                               /
 ******************************************************************/

router.get('/admin/salesman', function (req, res) {
    salesman_controller.list(req, res);
});

router.get('/admin/company', function (req, res) {
    company_controller.list(req, res);
});

router.get('/admin/pharmacy', function (req, res) {
    pharmacy_controller.list(req, res);
});

router.get('/admin/doctor', function (req, res) {
    doctor_controller.list(req, res);
});

router.get('/admin/client', function (req, res) {
    client_controller.list(req, res);
});

router.get('/admin/driver', function (req, res) {
    driver_controller.list(req, res);
});

router.get('/admin/member/add', function (req, res) {
   invite_controller.addUser(req, res)
});

router.get('/admin/callcenter', function (req, res) {
    call_center_controller.list(req, res);
});
router.get('/admin/callcenter/add', function (req, res) {
    call_center_controller.add(req, res);
});


router.post('/admin/callcenter/add', function (req, res) {
    call_center_controller.addCallCenter(req, res);
});

router.get('/admin/insurance/:ins_type', function (req, res) {
    ins_controller.showInsItems(req, res)
});

router.get('/admin/insurance/:op/:ins_type', function (req, res) {
    ins_controller.showAddInsItems(req, res);
});

router.get('/insurance/delete/:ins_type/:id', function (req, res) {
    ins_controller.deleteInsItem(req, res);
});

router.post('/admin/insurance/:op/:ins_type', function (req, res) {
    ins_controller.updateInsItems(req, res);
});

router.get('/admin/specialist', function (req, res) {
    spec_controller.showSpecItems(req, res)
});

router.get('/admin/specialist/:op', function (req, res) {
    spec_controller.showAddSpecItems(req, res);
});

router.get('/specialist/delete/:id', function (req, res) {
    spec_controller.deleteSpecItem(req, res);
});

router.post('/admin/specialist/:op', function (req, res) {
    spec_controller.updateSpecItems(req, res);
});

/**
 * Item Master Controller
 */
router.get('/admin/item', function (req, res) {
    item_controller.showItems(req, res)
});

router.get('/admin/item/:op', function (req, res) {
    item_controller.showAddItems(req, res);
});

router.get('/item/delete/:id', function (req, res) {
    item_controller.deleteItem(req, res);
});

router.post('/admin/item/:op', function (req, res) {
    item_controller.updateItems(req, res);
});

router.post('/item/upload_picture', function (req, res) {
    item_controller.uploadItemImage(req, res);
});

router.get('/admin/master-item/:mtType', function (req, res) {
    mi_controller.showMasterItems(req, res)
});

router.get('/admin/master-item/:mtType/:op', function (req, res) {
    mi_controller.showAddMasterItems(req, res);
});

router.get('/master-item/delete/:mtType/:id', function (req, res) {
    mi_controller.deleteMasterItem(req, res);
});

router.post('/admin/master-item/:mtType/:op', function (req, res) {
    mi_controller.updateMasterItems(req, res);
});

router.get('/admin/country', function (req, res) {
    country_controller.showItems(req, res)
});

router.get('/admin/country/:op', function (req, res) {
    country_controller.showAddItems(req, res);
});

router.get('/country/delete/:id', function (req, res) {
    country_controller.deleteItem(req, res);
});

router.post('/admin/country/:op', function (req, res) {
    country_controller.updateItems(req, res);
});

/**
 * Doctor Routers
 */
router.get('/orders', function (req, res) {
    order_controller.showOrders(req, res);
});

router.get('/orders/add', function (req, res) {
    order_controller.showAddOrder(req, res);
});

router.get('/orders/update/:orderId', function (req, res) {

});

router.get('/orders/view/:orderId', function (req, res) {
     order_controller.viewOrder(req, res);
});


router.post('/orders/create', function (req, res) {
    order_controller.createOrder(req, res);
});

router.post('/orders/update/:orderId', function () {

});
/**
 * Order Routers
 */

router.get('/client/orders', function (req, res) {
    client_controller.showOrders(req, res);
});
router.get('/client/my-invitation', function(req, res) {
    client_controller.showInviteList(req, res);
});
router.get('/client/item', function (req, res) {
    client_controller.showItems(req, res)
});
/******************************************************************
 *                  Salesman Router                                  /
 ******************************************************************/

router.get('/salesman/doctor/list', function(req, res) {
    salesman_controller.showDoctorList(req, res);
});

router.get('/salesman/invite/add', function(req, res){
    salesman_controller.addInvite(req, res);
});

/******************************************************************
 *                  Doctor Router                                  /
 ******************************************************************/
router.get('/doctor/my-invitation', function(req, res) {
    doctor_controller.showInviteList(req, res);
});
/******************************************************************
 *                  Invite Router                                  /
 ******************************************************************/

router.get('/invite/list', function (req, res) {
    invite_controller.list(req, res);
});

router.get('/invite/accept', function (req, res) {
    invite_controller.acceptInvite(req, res);
});

router.get('/invite/list/accept/:id', function (req, res) {
    invite_controller.acceptListInvite(req, res);
});

router.get('/profile/info', function (req, res) {
    invite_controller.showInviteStatus(req, res);
});

router.post('/profile/update', function (req, res) {
    invite_controller.updateInviteStatus(req, res);
});

router.post('/invite/add', function (req, res) {
    invite_controller.sendInvite(req, res);
});

router.get('/invite/delete/:id', function (req, res) {
    invite_controller.deleteInvite(req, res);
});
/******************************************************************
 *                  Common User Routes                           /
 *****************************************************************/
router.get('/user/profile', function (req, res) {
    user_controller.editProfile(req, res);
});

router.get('/user/delete/:userId', function (req, res) {
    user_controller.deleteUser(req, res);
});

router.post('/users/upload_avatar', function (req, res) {
    user_controller.uploadAvatar(req, res);
});

router.post('/user/update', function (req, res) {
    user_controller.updateProfile(req, res);
});

router.get('/user/change-password', function (req, res) {
    user_controller.changePassword(req, res);
});

router.post('/user/change-password', function (req, res) {
    user_controller.updatePassword(req, res);
});

/******************************************************************
 *                  Auth Controller                               /
 ******************************************************************/

router.get('/auth/login', function (req, res) {
    auth_controller.login(req, res);
});

router.get('/auth/register', function (req, res) {
    auth_controller.register(req, res);
});

router.post('/auth/login', function (req, res) {
    auth_controller.loginUser(req, res);
});

router.get('/auth/logout', function (req, res) {
    auth_controller.logout(req, res);
});

router.post('/auth/register', function (req, res) {
    auth_controller.createUser(req, res);
});

router.get('/auth/forgot-password', function (req, res) {
    auth_controller.forgotPassword(req, res);
});

router.get('/auth/confirm_account', function (req, res, next) {
    auth_controller.confirmAccount(req, res, next);
});

router.post('/auth/reset_password', function (req, res, next) {
    auth_controller.reset_password(req, res, next);
});

router.get('/auth/password/reset/:token', function (req, res, next) {
    auth_controller.show_password_change(req, res, next);
});

router.post('/auth/password/reset', function (req, res, next) {
    auth_controller.password_change(req, res, next);
});

router.get('*', function (req, res) {
    error_controller.show_404(req, res);
});

module.exports = router;
