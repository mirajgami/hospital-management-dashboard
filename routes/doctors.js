const express = require('express');
const router = express.Router();
const { isAuthenticated, hasRole } = require('../middleware/auth');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// LIST (all roles)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.render('doctors/index', { title: 'Doctors', doctors });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load doctors.');
    res.redirect('/dashboard');
  }
});

// NEW form (admin only)
router.get('/new', isAuthenticated, hasRole('admin'), (req, res) => {
  res.render('doctors/form', { title: 'Add Doctor', doctor: null });
});

// CREATE (admin only) - also creates a linked login account for the doctor
router.post('/', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const {
      name,
      specialization,
      department,
      phone,
      email,
      experienceYears,
      consultationFee,
      availableDays,
      availableTime,
      createLogin,
      password,
    } = req.body;

    const doctor = await Doctor.create({
      name,
      specialization,
      department,
      phone,
      email,
      experienceYears: experienceYears || 0,
      consultationFee: consultationFee || 0,
      availableDays: Array.isArray(availableDays) ? availableDays : availableDays ? [availableDays] : [],
      availableTime,
    });

    if (createLogin === 'on' && password) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (!existing) {
        const user = await User.create({
          name,
          email: email.toLowerCase().trim(),
          password,
          role: 'doctor',
          doctorProfile: doctor._id,
        });
        doctor.user = user._id;
        await doctor.save();
      } else {
        req.flash('error', 'Doctor added, but a login with that email already exists.');
      }
    }

    req.flash('success', 'Doctor added successfully.');
    res.redirect('/doctors');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not add doctor. Check the form and try again.');
    res.redirect('/doctors/new');
  }
});

// SHOW
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      req.flash('error', 'Doctor not found.');
      return res.redirect('/doctors');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [upcomingAppointments, pastAppointments] = await Promise.all([
      Appointment.find({ doctor: doctor._id, date: { $gte: todayStart }, status: 'Scheduled' })
        .populate('patient', 'name phone age gender')
        .sort({ date: 1 })
        .limit(20),
      Appointment.find({ doctor: doctor._id, $or: [{ date: { $lt: todayStart } }, { status: { $ne: 'Scheduled' } }] })
        .populate('patient', 'name phone')
        .sort({ date: -1 })
        .limit(20),
    ]);

    res.render('doctors/show', { title: doctor.name, doctor, upcomingAppointments, pastAppointments });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load doctor.');
    res.redirect('/doctors');
  }
});

// EDIT form (admin only)
router.get('/:id/edit', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      req.flash('error', 'Doctor not found.');
      return res.redirect('/doctors');
    }
    res.render('doctors/form', { title: 'Edit Doctor', doctor });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load doctor.');
    res.redirect('/doctors');
  }
});

// UPDATE (admin only)
router.put('/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const {
      name,
      specialization,
      department,
      phone,
      email,
      experienceYears,
      consultationFee,
      availableDays,
      availableTime,
      status,
    } = req.body;

    await Doctor.findByIdAndUpdate(req.params.id, {
      name,
      specialization,
      department,
      phone,
      email,
      experienceYears,
      consultationFee,
      availableDays: Array.isArray(availableDays) ? availableDays : availableDays ? [availableDays] : [],
      availableTime,
      status,
    });

    req.flash('success', 'Doctor updated successfully.');
    res.redirect(`/doctors/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not update doctor.');
    res.redirect(`/doctors/${req.params.id}/edit`);
  }
});

// DELETE (admin only)
router.delete('/:id', isAuthenticated, hasRole('admin'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (doctor && doctor.user) {
      await User.findByIdAndDelete(doctor.user);
    }
    await Doctor.findByIdAndDelete(req.params.id);
    req.flash('success', 'Doctor removed.');
    res.redirect('/doctors');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not remove doctor.');
    res.redirect('/doctors');
  }
});

module.exports = router;
