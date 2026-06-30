const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Link to user
  platform: { type: String, enum: ['Zepto', 'Blinkit', 'Instamart'], required: true },
  storeId: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  status: { type: String, default: 'searching', enum: ['searching', 'notified', 'expired'] },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour
});

module.exports = mongoose.model('Cart', CartSchema);