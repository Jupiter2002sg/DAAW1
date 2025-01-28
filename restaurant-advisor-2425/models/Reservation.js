const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' }
});

reservationSchema.index(
    { store: 1, date: 1, startTime: 1, user: 1 },
    { unique: true, message: 'You already have a reservation for this time slot.' }
);

reservationSchema.pre('validate', function (next) {
    if (this.date < new Date()) {
      return next(new Error('Reservation date cannot be in the past.'));
    }
    next();
});

reservationSchema.virtual('timeSlot').get(function () {
    return `${this.startTime} - ${this.endTime}`;
  });
  
  reservationSchema.post('save', async function (doc) {
    const Store = mongoose.model('Store');
    const store = await Store.findById(doc.store);
    const timeSlot = store.reservationSlots.find(
      slot =>
        slot.day === doc.date.toLocaleString('en-US', { weekday: 'long' }) &&
        slot.startTime === doc.startTime &&
        slot.endTime === doc.endTime
    );
  
    if (timeSlot) {
      if (doc.status === 'confirmed') {
        timeSlot.maxReservations -= 1;
      } else if (doc.status === 'cancelled') {
        timeSlot.maxReservations += 1;
      }
      await store.save();
    }
  });
  
  
module.exports = mongoose.model('Reservation', reservationSchema);

