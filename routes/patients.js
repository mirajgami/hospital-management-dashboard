const express = require('express');
const router = express.Router();
const { isAuthenticated, hasRole } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const { summarizePatient } = require('../services/aiPatientSummary');

// LIST + search (all logged-in roles can view)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { phone: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.render('patients/index', { title: 'Patients', patients, q });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load patients.');
    res.redirect('/dashboard');
  }
});

// NEW form (admin, receptionist)
router.get('/new', isAuthenticated, hasRole('admin', 'receptionist'), (req, res) => {
  res.render('patients/form', { title: 'Add Patient', patient: null });
});

// CREATE
router.post('/', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { name, age, gender, phone, email, address, bloodGroup, medicalHistory } = req.body;
    await Patient.create({
      name,
      age,
      gender,
      phone,
      email,
      address,
      bloodGroup,
      medicalHistory,
      registeredBy: req.session.user.id,
    });
    req.flash('success', 'Patient registered successfully.');
    res.redirect('/patients');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not register patient. Check the form and try again.');
    res.redirect('/patients/new');
  }
});

// SHOW (patient profile + their appointment & prescription history)
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      req.flash('error', 'Patient not found.');
      return res.redirect('/patients');
    }
    const [appointments, prescriptions] = await Promise.all([
      Appointment.find({ patient: patient._id })
        .populate('doctor', 'name specialization')
        .sort({ date: -1 }),
      Prescription.find({ patient: patient._id })
        .populate('prescribedBy', 'name')
        .sort({ date: -1 }),
    ]);

    res.render('patients/show', { title: patient.name, patient, appointments, prescriptions });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load patient.');
    res.redirect('/patients');
  }
});

// ADD PRESCRIPTION (admin, doctor) — the medicine autocomplete on this form is the NLP feature
router.post('/:id/prescriptions', isAuthenticated, hasRole('admin', 'doctor'), async (req, res) => {
  try {
    const { medicineName, dosage, frequency, duration, instructions, medicineId } = req.body;
    if (!medicineName || !medicineName.trim()) {
      req.flash('error', 'Medicine name is required.');
      return res.redirect(`/patients/${req.params.id}`);
    }

    await Prescription.create({
      patient: req.params.id,
      medicine: medicineId || null,
      medicineName: medicineName.trim(),
      dosage,
      frequency,
      duration,
      instructions,
      prescribedBy: req.session.user.id,
    });

    // If this exact name isn't in the catalog yet, quietly add it so future
    // searches (for any patient) benefit from it too — this is how the
    // "best past list" grows organically as staff use the system.
    const exists = await Medicine.findOne({ name: new RegExp(`^${medicineName.trim()}$`, 'i') });
    if (!exists) {
      await Medicine.create({ name: medicineName.trim() });
    }

    req.flash('success', 'Prescription added.');
    res.redirect(`/patients/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not add prescription.');
    res.redirect(`/patients/${req.params.id}`);
  }
});

// DELETE PRESCRIPTION (admin, doctor)
router.delete('/:id/prescriptions/:prescriptionId', isAuthenticated, hasRole('admin', 'doctor'), async (req, res) => {
  try {
    await Prescription.findOneAndDelete({ _id: req.params.prescriptionId, patient: req.params.id });
    req.flash('success', 'Prescription removed.');
    res.redirect(`/patients/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not remove prescription.');
    res.redirect(`/patients/${req.params.id}`);
  }
});

// GENERATE AI SUMMARY (admin, doctor) — returns JSON, called via fetch from the patient page
router.post('/:id/ai-summary', isAuthenticated, hasRole('admin', 'doctor'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const [appointments, prescriptions] = await Promise.all([
      Appointment.find({ patient: patient._id }).populate('doctor', 'name specialization').sort({ date: -1 }),
      Prescription.find({ patient: patient._id }).sort({ date: -1 }),
    ]);

    const summary = await summarizePatient(patient, appointments, prescriptions);

    patient.aiSummary = summary;
    patient.aiSummaryGeneratedAt = new Date();
    await patient.save();

    res.json({ summary, generatedAt: patient.aiSummaryGeneratedAt });
  } catch (err) {
    console.error('AI summary error:', err.message);
    res.status(500).json({ error: 'AI summary is unavailable right now.' });
  }
});

// EDIT form (admin, receptionist)
router.get('/:id/edit', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      req.flash('error', 'Patient not found.');
      return res.redirect('/patients');
    }
    res.render('patients/form', { title: 'Edit Patient', patient });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load patient.');
    res.redirect('/patients');
  }
});

// UPDATE
router.put('/:id', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { name, age, gender, phone, email, address, bloodGroup, medicalHistory, status } = req.body;
    await Patient.findByIdAndUpdate(req.params.id, {
      name,
      age,
      gender,
      phone,
      email,
      address,
      bloodGroup,
      medicalHistory,
      status,
    });
    req.flash('success', 'Patient updated successfully.');
    res.redirect(`/patients/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not update patient.');
    res.redirect(`/patients/${req.params.id}/edit`);
  }
});

// DELETE (admin only)
router.delete('/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    await Patient.findByIdAndDelete(req.params.id);
    await Appointment.deleteMany({ patient: req.params.id });
    req.flash('success', 'Patient record deleted.');
    res.redirect('/patients');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not delete patient.');
    res.redirect('/patients');
  }
});

module.exports = router;
