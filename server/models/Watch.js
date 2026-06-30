const mongoose = require('mongoose');

const watchSchema = new mongoose.Schema({
    platform: { type: String, required: true }, // 'Zepto' or 'Blinkit'
    location: { type: String, required: true }, // e.g., 'Chennai'
    userId: { type: String, required: true }, 
    lat: { type: Number },
    lng: { type: Number },
    fcmToken: { type: String }, // For Firebase Push Alerts later
    status: { type: String, default: 'Watching', enum: ['Watching', 'Notified', 'Expired'] },
    createdAt: { type: Date, default: Date.now, expires: 7200 } // Auto-destruct tasks after 2 hours
});

module.exports = mongoose.model('Watch', watchSchema);