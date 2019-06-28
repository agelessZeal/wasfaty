let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let InvoiceSchema = new Schema({
    code: String,
    description: String,
    dosage: String,
    dosageFile: String,
    qty: Number,
    price: String,
    total: Number,
});

module.exports = mongoose.model('invoice', InvoiceSchema);
