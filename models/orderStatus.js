let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let OrderStatusSchema = new Schema({
    orderId: String,
    phId: String,
    driverId: String,
    description: String,
    orderType: String, // PhPicked, PhAccepted, Rejected,  DriverPicked, DriverAccepted, DriverRejected,  PhClosed, DriverClosed.....
    phInfoId: String,
    createdAt: Date,
    updatedAt: Date,
    closedAt: Date,
});

module.exports = mongoose.model('order_status', OrderStatusSchema);
