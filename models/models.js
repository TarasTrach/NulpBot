const mongoose = require('mongoose');

const UniqueCodeSchema = new mongoose.Schema({
   code: { type: String, unique: true },
   subscriptionDuration: { type: String, enum: ['1d', '3d', '1w', '1m', '3m'] },
});

const sellerSchema = new mongoose.Schema({
   telegramId: { type: Number, unique: true },
   name: { type: String, required: true },
   subscription: {
      expiresAt: { type: Date, default: null },
      isActive: { type: Boolean, default: false },
   },
   numberOfAnnouncements: { type: Number, default: 0 },
   maxAnnouncements: { type: Number, default: 2 },
});


const AnnouncementSchema = new mongoose.Schema({
   sellerId: { type: Number, required: true },
   option: { type: String, required: true },
   properties: {
      text: { type: String, required: true }
   },
   isPendingModeration: { type: Boolean, default: true },
   isApproved: { type: Boolean, default: false },
   isActive: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
   userId: { type: Number, unique: true },
   username: { type: String },
   nickname: { type: String },
   course: { type: Number, default: 1 },
   registrationDate: { type: Date, default: Date.now },
});

const userStepsSchema = new mongoose.Schema({
   chatId: { type: Number, required: true },
   steps: [{ type: String }],
});

const UserStepsModel = mongoose.model('UserStep', userStepsSchema);
const UserModel = mongoose.model('User', userSchema);
const AnnouncementModel = mongoose.model('Announcement', AnnouncementSchema);
const UniqueCodeModel = mongoose.model('UniqueCode', UniqueCodeSchema);
const SellerModel = mongoose.model('Seller', sellerSchema);

module.exports = { AnnouncementModel, UniqueCodeModel, SellerModel, UserModel, UserStepsModel };