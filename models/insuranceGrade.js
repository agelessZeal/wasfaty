let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let InsuranceGradeSchema = new Schema({
    name: String,
    description: String,
    createdAt: Date,
});

module.exports = mongoose.model('insurance_grade', InsuranceGradeSchema);
