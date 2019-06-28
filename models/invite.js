let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let InviteSchema = new Schema({
    senderEmail: String,
    senderRole: String,
    receiverEmail: String,
    receiverRole: String,
    password: String,
    token: String,
    status: String, //Awaiting, Accepted
    createdAt: Date,
    acceptedAt: Date,
});

module.exports = mongoose.model('invite', InviteSchema);
