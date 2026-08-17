const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g. '10:30 AM'
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // AI triage suggestion (from Claude), captured when the reason is analyzed
    aiUrgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Emergency', null],
      default: null,
    },
    aiSuggestedDepartment: { type: String, trim: true, default: '' },
    aiReasoning: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
