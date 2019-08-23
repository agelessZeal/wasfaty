let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let OrderItemHistSchema = new Schema({
    orderId: String,
    email: String,
    userType: String,
    orderDate: Date,
    itemId: String,
    itemName: String,
    qty: Number,
    itemPrice: Number,
    totalAmount: Number,
    comm: Number,
    commAmount: Number
});

module.exports = mongoose.model('order_item_history', OrderItemHistSchema);
