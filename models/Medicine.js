const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // brand/common name, e.g. "Crocin"
    genericName: { type: String, trim: true, default: '' }, // e.g. "Paracetamol"
    category: { type: String, trim: true, default: '' }, // e.g. "Analgesic"
    form: { type: String, trim: true, default: '' }, // Tablet, Syrup, Injection, etc.
    commonDosage: { type: String, trim: true, default: '' }, // e.g. "500mg"
  },
  { timestamps: true }
);

// Text index powers fast fuzzy-ish search across both brand and generic names
medicineSchema.index({ name: 'text', genericName: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
