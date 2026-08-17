const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const { role, doctorProfile } = req.session.user;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let appointmentFilter = { date: { $gte: todayStart, $lte: todayEnd } };
    if (role === 'doctor' && doctorProfile) {
      appointmentFilter.doctor = doctorProfile;
    }

    const [totalPatients, totalDoctors, todayAppointments, upcomingAppointments, recentPatients] =
      await Promise.all([
        Patient.countDocuments(),
        Doctor.countDocuments({ status: 'active' }),
        Appointment.countDocuments(appointmentFilter),
        Appointment.find(
          role === 'doctor' && doctorProfile
            ? { doctor: doctorProfile, date: { $gte: todayStart }, status: 'Scheduled' }
            : { date: { $gte: todayStart }, status: 'Scheduled' }
        )
          .populate('patient', 'name phone')
          .populate('doctor', 'name specialization')
          .sort({ date: 1 })
          .limit(6),
        Patient.find().sort({ createdAt: -1 }).limit(5),
      ]);

    res.render('dashboard', {
      title: 'Dashboard',
      totalPatients,
      totalDoctors,
      todayAppointments,
      upcomingAppointments,
      recentPatients,
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not load dashboard.');
    res.render('dashboard', {
      title: 'Dashboard',
      totalPatients: 0,
      totalDoctors: 0,
      todayAppointments: 0,
      upcomingAppointments: [],
      recentPatients: [],
    });
  }
});

module.exports = router;
