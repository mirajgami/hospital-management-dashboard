# MediCare HMS — Hospital Management Dashboard

A full-stack hospital management dashboard built with **Express.js**, **MongoDB (Mongoose)**, **EJS**, **HTML/CSS**, and **Bootstrap 5**.

## Features

- **Role-based login**: Admin, Doctor, Receptionist — each sees a different set of permissions.
- **Patients**: register, search, view profile + full appointment history, edit, discharge/delete.
- **Doctors**: add doctor profiles, optionally create a linked login account, edit/deactivate/remove.
- **Appointments**: schedule, filter by status, edit (admin/receptionist), and doctors can update status + consultation notes on their own appointments.
- **🤖 AI Symptom Triage**: on the appointment form, click "Analyze with AI" and Claude reads the reason for visit, then suggests a department and urgency level (Low/Medium/High/Emergency). Saved on the appointment and shown as a badge everywhere appointments are listed.
- **🤖 NLP Medicine Autocomplete**: on a patient's Prescriptions section, typing a medicine name shows ranked live suggestions — this patient's own past medicines first, then the hospital-wide catalog, and if nothing matches locally (typo, brand name, etc.) Claude corrects/normalizes the name as a fallback. Every new medicine typed quietly grows the shared catalog for next time.
- **🤖 AI Patient Summary**: one click on a patient's profile condenses their medical history, visit history, and prescriptions into a short clinical brief for the doctor.
- **Dashboard**: live stats (total patients, active doctors, today's appointments), upcoming appointments, recently registered patients.
- Sessions stored in MongoDB (`connect-mongo`) so logins survive server restarts.
- Flash messages for success/error feedback.
- Responsive Bootstrap 5 UI with a collapsible sidebar for mobile.

## Role Permissions

| Action                        | Admin | Receptionist | Doctor |
|--------------------------------|:-----:|:-------------:|:------:|
| View dashboard/patients/doctors/appointments | ✅ | ✅ | ✅ (own appointments only) |
| Add / edit patients            | ✅    | ✅            | ❌     |
| Delete patients                | ✅    | ❌            | ❌     |
| Add / edit / delete doctors    | ✅    | ❌            | ❌     |
| Schedule / edit / delete appointments | ✅ | ✅        | ❌     |
| Update status & notes on own appointments | ✅ | ❌       | ✅     |

## Setup

### 1. Prerequisites
- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

### 2. Install dependencies
```bash
cd hms
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```
```
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/hospital_management
SESSION_SECRET=change_this_to_a_long_random_string
ADMIN_NAME=Super Admin
ADMIN_EMAIL=admin@hospital.com
ADMIN_PASSWORD=Admin@123
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_MODEL=claude-sonnet-5
```

`ANTHROPIC_API_KEY` is only needed for the AI Symptom Triage feature — get one at [console.anthropic.com](https://console.anthropic.com). Everything else works fine without it; the "Analyze with AI" button will just show an error toast if the key is missing.

### 4. Seed the first Admin account
```bash
npm run seed
```
This creates one Admin login using the credentials from `.env`. Log in with those, then:
- Use **Doctors → Add Doctor** and check "Create a login account" to give doctors access.
- Create Receptionist accounts by adding a small admin-only "Manage Users" route (not included in v1 — see below), or insert directly via MongoDB for now.

To create a Receptionist (or any staff) login from the command line, use the included helper:
```bash
node create-user.js "Reception Desk" reception@hospital.com Recept@123 receptionist
```

### 4b. Seed the medicine catalog (optional but recommended)
```bash
npm run seed:medicines
```
Loads ~30 common medicines (brand + generic names) so the prescription autocomplete has something to search on day one. The catalog also grows automatically as staff enter new medicine names.

### 5. Run the app
```bash
npm run dev   # with nodemon, auto-restart
# or
npm start
```
Visit **http://localhost:3000**

## Project Structure
```
hms/
├── server.js              # App entry point
├── seed.js                 # Creates the first Admin account
├── config/db.js            # MongoDB connection
├── middleware/auth.js      # isAuthenticated / hasRole guards
├── models/                 # User, Doctor, Patient, Appointment
├── routes/                 # auth, dashboard, patients, doctors, appointments
├── views/                  # EJS templates (layout, sidebar, topbar, pages)
└── public/                 # css/style.css, js/main.js
```

## Tech Notes
- Auth uses `express-session` + `connect-mongo` (sessions in MongoDB) + `bcryptjs` for password hashing.
- Forms use `method-override` to send PUT/DELETE from plain HTML forms.
- Flash messages via `connect-flash`.
- All list/detail views are server-rendered EJS with Bootstrap 5 (CDN) — no separate frontend build step needed.

## How AI Triage Works (services/aiTriage.js)

1. Receptionist types a "reason for visit" (e.g. "chest pain and shortness of breath").
2. Clicking **Analyze with AI** sends that text to `POST /appointments/triage`.
3. The route calls Claude with the hospital's actual department list (pulled live from `Doctor.distinct('department')`) and asks for a JSON response: `{ department, urgency, reasoning }`.
4. The urgency badge, department suggestion, and reasoning render inline, get stored in hidden form fields, and are saved on the `Appointment` document once the form is submitted.
5. This is a **routing suggestion only** — it never recommends medication or a diagnosis, and staff always make the final call on doctor/urgency.

## How Medicine Autocomplete Works (routes/medicines.js + services/aiMedicineMatch.js)

Typing in the "Medicine Name" field on a patient's Prescriptions section triggers `GET /api/medicines/search`, which layers three ranked sources:

1. **This patient's own history** — `Prescription` documents for that patient matching the text (highest priority: "what's been used for them before").
2. **Hospital-wide catalog** — the `Medicine` collection, matched on brand or generic name.
3. **AI fallback** — only fires when the first two return nothing (likely a typo or an unfamiliar brand name). `services/aiMedicineMatch.js` sends the typed text plus a shortlist of catalog names to Claude, which returns a corrected spelling and/or a best-guess catalog match.

Selecting a suggestion auto-fills the name (and dosage/frequency, if picked from patient history). Submitting a brand-new name quietly adds it to the shared `Medicine` catalog so it's searchable for every future patient too — this is how the "best past list" grows over time. It's a name-lookup/autocomplete tool only — never a dosage or treatment recommendation.

## How AI Patient Summary Works (services/aiPatientSummary.js)

The "Generate" button on a patient's profile sends their medical history, recent appointments, and recent prescriptions to Claude and asks for a strict 3-line brief (Profile / History / Pattern), capped at 120 words and grounded only in what's in the record — no invented facts, no diagnosis or treatment suggestions. The result is cached on the `Patient` document (`aiSummary`, `aiSummaryGeneratedAt`) so it doesn't need regenerating on every page load.

## Suggested Next Steps
- Add a "Manage Staff" screen so Admin can create Receptionist logins from the UI.
- Add pagination to Patients/Appointments once data grows.
- Add a calendar view for appointments.
- Add email/SMS reminders for upcoming appointments.
