let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let CountrySchema = new Schema({
    name: String,
    capitalName: String,
    createdAt: Date,
});

module.exports = mongoose.model('country', CountrySchema);
