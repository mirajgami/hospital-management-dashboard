const express = require('express');
const router = express.Router();
const { isAuthenticated, hasRole } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { triageSymptoms } = require('../services/aiTriage');

// AI Symptom Triage — analyzes free-text reason and suggests department + urgency
// Called via fetch() from the appointment form, returns JSON (not a redirect)
router.post('/triage', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Please enter a reason for visit first.' });
    }

    const departments = await Doctor.distinct('department', { status: 'active' });
    const result = await triageSymptoms(reason, departments);

    res.json(result);
  } catch (err) {
    console.error('Triage error:', err.message);
    res.status(500).json({ error: 'AI triage is unavailable right now. Please select the doctor manually.' });
  }
});

// LIST (doctors only see their own appointments)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { role, doctorProfile } = req.session.user;
    const filter = {};

    if (role === 'doctor' && doctorProfile) {
      filter.doctor = doctorProfile;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'name phone')
      .populate('doctor', 'name specialization')
      .sort({ date: -1 });

    res.render('appointments/index', {
      title: 'Appointments',
      appointments,
      statusFilter: req.query.status || '',
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load appointments.');
    res.redirect('/dashboard');
  }
});

// NEW form (admin, receptionist)
router.get('/new', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    const patients = await Patient.find().sort({ name: 1 });
    const doctors = await Doctor.find({ status: 'active' }).sort({ name: 1 });
    res.render('appointments/form', {
      title: 'Schedule Appointment',
      appointment: null,
      patients,
      doctors,
      preselectPatient: req.query.patient || '',
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not open the scheduling form.');
    res.redirect('/appointments');
  }
});

// CREATE (admin, receptionist)
router.post('/', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { patient, doctor, date, time, reason, aiUrgency, aiSuggestedDepartment, aiReasoning } = req.body;
    await Appointment.create({
      patient,
      doctor,
      date,
      time,
      reason,
      createdBy: req.session.user.id,
      aiUrgency: aiUrgency || null,
      aiSuggestedDepartment: aiSuggestedDepartment || '',
      aiReasoning: aiReasoning || '',
    });
    req.flash('success', 'Appointment scheduled successfully.');
    res.redirect('/appointments');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not schedule appointment. Check the form and try again.');
    res.redirect('/appointments/new');
  }
});

// SHOW
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor');
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect('/appointments');
    }

    const { role, doctorProfile } = req.session.user;
    if (role === 'doctor' && String(appointment.doctor._id) !== String(doctorProfile)) {
      req.flash('error', 'You can only view your own appointments.');
      return res.redirect('/appointments');
    }

    res.render('appointments/show', { title: 'Appointment Details', appointment });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load appointment.');
    res.redirect('/appointments');
  }
});

// EDIT form (admin, receptionist only - full edit; doctors use status update instead)
router.get('/:id/edit', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      req.flash('error', 'Appointment not found.');
      return res.redirect('/appointments');
    }
    const patients = await Patient.find().sort({ name: 1 });
    const doctors = await Doctor.find().sort({ name: 1 });
    res.render('appointments/form', {
      title: 'Edit Appointment',
      appointment,
      patients,
      doctors,
      preselectPatient: '',
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load appointment.');
    res.redirect('/appointments');
  }
});

// UPDATE (admin, receptionist)
router.put('/:id', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { patient, doctor, date, time, reason, status, notes } = req.body;
    await Appointment.findByIdAndUpdate(req.params.id, {
      patient,
      doctor,
      date,
      time,
      reason,
      status,
      notes,
    });
    req.flash('success', 'Appointment updated successfully.');
    res.redirect(`/appointments/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not update appointment.');
    res.redirect(`/appointments/${req.params.id}/edit`);
  }
});

// Doctors: quick status + notes update on their own appointment
router.put('/:id/status', isAuthenticated, hasRole('doctor'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    const { doctorProfile } = req.session.user;
    if (!appointment || String(appointment.doctor) !== String(doctorProfile)) {
      req.flash('error', 'You can only update your own appointments.');
      return res.redirect('/appointments');
    }
    const { status, notes } = req.body;
    appointment.status = status;
    appointment.notes = notes;
    await appointment.save();
    req.flash('success', 'Appointment updated.');
    res.redirect(`/appointments/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not update appointment.');
    res.redirect('/appointments');
  }
});

// DELETE / cancel (admin, receptionist)
router.delete('/:id', isAuthenticated, hasRole('admin', 'receptionist'), async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    req.flash('success', 'Appointment removed.');
    res.redirect('/appointments');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not remove appointment.');
    res.redirect('/appointments');
  }
});

module.exports = router;
