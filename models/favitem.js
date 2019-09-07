let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let mongoosePaginate = require('mongoose-paginate-v2');

let FavItemSchema = new Schema({
    itemId: String,
    createdBy: String,
    createdAt: Date,
});

FavItemSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('fav_item_master', FavItemSchema);
