let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let AnnouncementSchema = new Schema({
    annId: String,
    userType: String,
    title: String,
    description: String,
    createdAt: Date,
});

module.exports = mongoose.model('announcement', AnnouncementSchema);
