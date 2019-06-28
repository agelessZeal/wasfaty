let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let MasterItemSchema = new Schema({
    mtId: String,
    name_en: String,
    name_ar: String,
    mtType: String, // ['Dosage', 'Brand', 'Product Form', 'Concentration', 'Quantity', 'Unit of measurement', 'Ingredient', 'Flavor', 'Color']
    createdAt: Date,
});

module.exports = mongoose.model('master_item', MasterItemSchema);
