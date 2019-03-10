const mongoose = require('mongoose');

const historySchema = mongoose.Schema({
  question: String,
  answer: String,
  date: Date,
  user: String,
});

module.exports = mongoose.model('History', historySchema);
