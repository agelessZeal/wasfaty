let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let UserSchema = new Schema({
    email: String,
    password: String,
    phone: String,
    nameAr: String,
    nameEn: String,
    pic: String,
    role: String, //admin, office

    commissions: Number,

    birthDay: String,
    gender: String,
    country: String,
    city: String,
    // nationality: Schema.Types.ObjectId,
    nationality: String,
    status: String, // controlled by Admin or Higher Level User

    companyName: String, // not used for the client
    companyFile: String, // attachment

    insuranceType: String, //type
    insuranceGrade: String, //type
    insuranceCompany: String, //type

    address: String, //used for the only client
    spec: String, //specialist

    gpsLat:Number, //latitude, longitude, altitude, address used in pharmacy location
    gpsLong: Number,

    licenceNo: String, // Driver data, {no, expDate}
    licenceExpDate: String, // Driver data, {no, expDate}

    inviterEmailList: Array, //Inviter Email

    createdAt: Date,  //Time Stamp,
    emailActive: String,

    loginCount: Number,
    isDoneProfile: Boolean,
    ipAddress: String,

    token: String,//Password Reset Token
});

module.exports = mongoose.model('user', UserSchema);
