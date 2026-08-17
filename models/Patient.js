const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    phone: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    medicalHistory: { type: String, trim: true, default: '' },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'discharged'], default: 'active' },
    aiSummary: { type: String, trim: true, default: '' },
    aiSummaryGeneratedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);
