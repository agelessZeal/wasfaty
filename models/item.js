let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let mongoosePaginate = require('mongoose-paginate-v2');

let ItemSchema = new Schema({
    itemId: String,
    mainClassId: String,
    subClassId: String,
    brandId: String,
    pdtFormId: String,
    cctId: String,
    dosageId: String,
    qtyId: String,
    unitMsId: String,
    ingId: String,
    flavorId: String,
    cpyNameId: String,
    ageRangeId: String,
    colorId: String,
    name_en: String,
    name_ar: String,
    description_en: String,
    description_ar: String,
    price: Number,
    pic: String,
    barcode: String,
    isOrder: Boolean,
    comm: Number, // Percent
    createdAt: Date,
});

ItemSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('item_master', ItemSchema);
