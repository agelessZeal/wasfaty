let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let SettingSchema = new Schema({
    settingKey: String,
    content: Object
});

module.exports = mongoose.model('setting', SettingSchema);
