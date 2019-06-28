let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let NewsSchema = new Schema({
    newsId: String,
    title: String,
    description: String,
    attachments: Array,
    createdAt: Date,
});

module.exports = mongoose.model('news_list', NewsSchema);
