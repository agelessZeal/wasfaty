let express, router, config;
let call_center_controller;

express = require('express');
router = express.Router();
config = require('../config/index');

call_center_controller = require('../controllers/CallCenterController');

/**
 * Frontend Routers
 */

router.get('/orders', function (req, res) {
    call_center_controller.showOrders(req, res);
});

router.get('/orders/delivery/view/:orderId', function (req, res) {
    call_center_controller.viewDeliveryOrder(req, res);
});

router.get('/orders/delivery/selected/:orderId/:driverId', function (req, res) {
    call_center_controller.selectedDeliveryOrder(req, res);
});

module.exports = router;
