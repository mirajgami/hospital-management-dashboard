// Quick CLI helper to create a Receptionist, Doctor, or Admin login
// Usage: node create-user.js "Full Name" email@hospital.com password123 receptionist
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const [name, email, password, role] = process.argv.slice(2);

if (!name || !email || !password || !role) {
  console.log('Usage: node create-user.js "Full Name" email@hospital.com password123 receptionist');
  console.log('Valid roles: admin, doctor, receptionist');
  process.exit(1);
}

if (!['admin', 'doctor', 'receptionist'].includes(role)) {
  console.log('Role must be one of: admin, doctor, receptionist');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.log(`A user with email ${email} already exists.`);
      process.exit(1);
    }
    await User.create({ name, email: email.toLowerCase().trim(), password, role });
    console.log(`Created ${role} account for ${name} (${email}).`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create user:', err.message);
    process.exit(1);
  }
})();
