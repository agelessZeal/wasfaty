let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let MessageSchema = new Schema({
    messageId: String,
    userEmail: String,
    userType: String,
    title: String,
    description: String,
    createdAt: Date,
});

module.exports = mongoose.model('message', MessageSchema);
