let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let InsuranceCompanySchema = new Schema({
    name: String,
    description: String,
    createdAt: Date,
});

module.exports = mongoose.model('insurance_company', InsuranceCompanySchema);
