require('dotenv').config();
const mongoose = require('mongoose');
const Medicine = require('./models/Medicine');

const medicines = [
  { name: 'Crocin', genericName: 'Paracetamol', category: 'Analgesic/Antipyretic', form: 'Tablet', commonDosage: '500mg' },
  { name: 'Dolo 650', genericName: 'Paracetamol', category: 'Analgesic/Antipyretic', form: 'Tablet', commonDosage: '650mg' },
  { name: 'Combiflam', genericName: 'Ibuprofen + Paracetamol', category: 'Analgesic', form: 'Tablet', commonDosage: '400mg/325mg' },
  { name: 'Brufen', genericName: 'Ibuprofen', category: 'NSAID', form: 'Tablet', commonDosage: '400mg' },
  { name: 'Amoxyclav', genericName: 'Amoxicillin + Clavulanate', category: 'Antibiotic', form: 'Tablet', commonDosage: '625mg' },
  { name: 'Azithral', genericName: 'Azithromycin', category: 'Antibiotic', form: 'Tablet', commonDosage: '500mg' },
  { name: 'Ciplox', genericName: 'Ciprofloxacin', category: 'Antibiotic', form: 'Tablet', commonDosage: '500mg' },
  { name: 'Pantop', genericName: 'Pantoprazole', category: 'Antacid/PPI', form: 'Tablet', commonDosage: '40mg' },
  { name: 'Omez', genericName: 'Omeprazole', category: 'Antacid/PPI', form: 'Capsule', commonDosage: '20mg' },
  { name: 'Zantac', genericName: 'Ranitidine', category: 'Antacid', form: 'Tablet', commonDosage: '150mg' },
  { name: 'Cetrizine', genericName: 'Cetirizine', category: 'Antihistamine', form: 'Tablet', commonDosage: '10mg' },
  { name: 'Allegra', genericName: 'Fexofenadine', category: 'Antihistamine', form: 'Tablet', commonDosage: '120mg' },
  { name: 'Montair', genericName: 'Montelukast', category: 'Anti-allergic', form: 'Tablet', commonDosage: '10mg' },
  { name: 'Asthalin', genericName: 'Salbutamol', category: 'Bronchodilator', form: 'Inhaler', commonDosage: '100mcg' },
  { name: 'Glycomet', genericName: 'Metformin', category: 'Antidiabetic', form: 'Tablet', commonDosage: '500mg' },
  { name: 'Amaryl', genericName: 'Glimepiride', category: 'Antidiabetic', form: 'Tablet', commonDosage: '2mg' },
  { name: 'Losar', genericName: 'Losartan', category: 'Antihypertensive', form: 'Tablet', commonDosage: '50mg' },
  { name: 'Amlokind', genericName: 'Amlodipine', category: 'Antihypertensive', form: 'Tablet', commonDosage: '5mg' },
  { name: 'Ecosprin', genericName: 'Aspirin', category: 'Antiplatelet', form: 'Tablet', commonDosage: '75mg' },
  { name: 'Atorva', genericName: 'Atorvastatin', category: 'Statin', form: 'Tablet', commonDosage: '10mg' },
  { name: 'Thyronorm', genericName: 'Levothyroxine', category: 'Thyroid hormone', form: 'Tablet', commonDosage: '50mcg' },
  { name: 'Shelcal', genericName: 'Calcium + Vitamin D3', category: 'Supplement', form: 'Tablet', commonDosage: '500mg' },
  { name: 'Becosules', genericName: 'Vitamin B Complex', category: 'Supplement', form: 'Capsule', commonDosage: '-' },
  { name: 'Zincovit', genericName: 'Multivitamin + Zinc', category: 'Supplement', form: 'Tablet', commonDosage: '-' },
  { name: 'Ondem', genericName: 'Ondansetron', category: 'Antiemetic', form: 'Tablet', commonDosage: '4mg' },
  { name: 'Sinarest', genericName: 'Paracetamol + Phenylephrine + Chlorpheniramine', category: 'Cold & Flu', form: 'Tablet', commonDosage: '-' },
  { name: 'Volini Gel', genericName: 'Diclofenac', category: 'Topical NSAID', form: 'Gel', commonDosage: '1%' },
  { name: 'Betadine', genericName: 'Povidone Iodine', category: 'Antiseptic', form: 'Solution', commonDosage: '5%' },
  { name: 'Digene', genericName: 'Antacid combination', category: 'Antacid', form: 'Syrup', commonDosage: '-' },
  { name: 'Norflox TZ', genericName: 'Norfloxacin + Tinidazole', category: 'Antibiotic', form: 'Tablet', commonDosage: '400mg/600mg' },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    let created = 0;
    for (const med of medicines) {
      const exists = await Medicine.findOne({ name: med.name });
      if (!exists) {
        await Medicine.create(med);
        created++;
      }
    }
    console.log(`Medicine catalog seeded. ${created} new medicine(s) added (${medicines.length - created} already existed).`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding medicines failed:', err.message);
    process.exit(1);
  }
})();
