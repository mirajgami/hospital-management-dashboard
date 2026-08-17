require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = (process.env.ADMIN_EMAIL || 'admin@hospital.com').toLowerCase();
    const existing = await User.findOne({ email });

    if (existing) {
      console.log(`Admin already exists: ${email}`);
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || 'Super Admin',
        email,
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'admin',
      });
      console.log('Admin account created:');
      console.log(`  Email:    ${email}`);
      console.log(`  Password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
      console.log('Please log in and change this password / create real accounts.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
})();
