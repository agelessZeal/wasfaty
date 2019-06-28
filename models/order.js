let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let OrderSchema = new Schema({
    orderId: String,
    doctorEmail: String, //doctor email
    clientEmail: String, //client email,
    clientPhone: String,
    clientName: String,
    insuranceGrade: String,
    insuranceCompany: String,
    insuranceType: String,
    remark: String,
    status: String, // ['Open', 'Pending', 'Closed', 'Cancelled', 'Under process'],
    items: Array,
    totalPrice: Number,
    createdAt: String,
    closedAt: String,
});

module.exports = mongoose.model('order', OrderSchema);
