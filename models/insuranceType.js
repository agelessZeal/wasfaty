let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let InsuranceTypeSchema = new Schema({
    name: String,
    description: String,
    createdAt: Date,
});

module.exports = mongoose.model('insurance_type', InsuranceTypeSchema);
