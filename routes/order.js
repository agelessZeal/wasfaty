let express, router, config;
let order_controller;

express = require('express');
router = express.Router();
config = require('../config/index');

order_controller = require('../controllers/OrderController');

/**
 * Orders Routers
 */
router.get('/', function (req, res) {
    order_controller.showOrders(req, res);
});

router.get('/add', function (req, res) {
    order_controller.showAddOrder(req, res);
});

router.get('/delete/:orderId', function (req, res) {
    order_controller.deleteOrder(req, res);
});

router.get('/edit/:orderId', function (req, res) {
    order_controller.showEditOrder(req, res);
});

router.get('/closed-edit/:orderId', function (req, res) {
    order_controller.showClosedEditOrder(req, res);
});

router.post('/orders-item/closed-update', function (req, res) {
    order_controller.updateClosedOrder(req, res);
});

router.get('/view/:orderId', function (req, res) {
    order_controller.viewOrder(req, res);
});

router.get('/pickup/accept/:orderId/:orderPhId', function (req, res) {
    order_controller.acceptPickupOrder(req, res);
});

router.get('/pickup/reject/:orderId/:orderPhId/:reason', function (req, res) {
    order_controller.rejectPickupOrder(req, res);
});

router.get('/pickup/:orderId', function (req, res) {
    order_controller.viewPickupOrder(req, res);
});

router.get('/pickup/selected/:orderId/:phId', function (req, res) {
    order_controller.selectingPickUpOrder(req, res);
});

router.get('/pickup/close/:orderId/:orderStId', function (req, res) {
    order_controller.closePickUpOrder(req, res);
});
///=======================================================
router.get('/delivery/accept/:orderId', function (req, res) {
    order_controller.acceptDeliveryOrder(req, res);
});

router.get('/delivery/reject/:orderId/:orderDeliveryId/:reason', function (req, res) {
    order_controller.rejectDeliveryOrder(req, res);
});

router.get('/delivery/:orderId', function (req, res) {
    order_controller.viewDeliveryOrder(req, res);
});

router.get('/delivery/picked/:orderId', function (req, res) {
    order_controller.pickingDeliveryOrder(req, res); //New Function
});

router.get('/delivery/selected/:orderId/:driverId', function (req, res) {
    order_controller.selectingDeliveryOrder(req, res); //Old Function, this is not used in current system
});

router.get('/delivery/close/:orderId/:orderStId', function (req, res) {
    order_controller.closeDeliveryOrder(req, res);
});

router.post('/print/commission', function (req, res) {
    order_controller.printUserCommission(req, res);
});

//=====================================

router.post('/create', function (req, res) {
    order_controller.createOrder(req, res);
});

router.post('/update/:orderId', function (req, res) {
    order_controller.updateOrder(req, res);
});


router.get('/canceled/:orderId', function (req, res) {
    order_controller.cancelOrder(req, res);
});

router.post('/view/print', function (req, res) {
    order_controller.printOrder(req, res);
});

module.exports = router;
