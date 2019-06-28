let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let SpecSchema = new Schema({
    specId: String,
    name_en: String,
    name_ar: String,
    createdAt: Date,
});

module.exports = mongoose.model('specialist', SpecSchema);
