const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', default: null }, // linked if it matched the catalog
    medicineName: { type: String, required: true, trim: true }, // free text actually entered, in case it's not catalogued
    dosage: { type: String, trim: true, default: '' },
    frequency: { type: String, trim: true, default: '' }, // e.g. "Twice daily"
    duration: { type: String, trim: true, default: '' }, // e.g. "5 days"
    instructions: { type: String, trim: true, default: '' },
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
