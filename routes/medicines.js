const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const { suggestMedicineMatch } = require('../services/aiMedicineMatch');

// GET /api/medicines/search?q=para&patientId=...
// Returns ranked suggestions: this patient's past medicines first, then catalog matches.
// If local search finds nothing, falls back to Claude to correct typos / map brand->generic.
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const { patientId } = req.query;

    if (!q || q.length < 2) {
      return res.json({ patientHistory: [], catalogMatches: [], aiSuggestion: null });
    }

    const regex = new RegExp(q, 'i');

    // 1. This patient's own past prescriptions matching the query (highest relevance —
    //    "predict from best past list" as requested: what's worked/been used for THEM before)
    let patientHistory = [];
    if (patientId) {
      const past = await Prescription.find({ patient: patientId, medicineName: regex })
        .sort({ date: -1 })
        .limit(5);
      // De-duplicate by medicine name, keep most recent dosage/frequency as a smart default
      const seen = new Set();
      patientHistory = past.filter((p) => {
        const key = p.medicineName.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // 2. Hospital-wide catalog match (brand + generic name)
    const catalogMatches = await Medicine.find({
      $or: [{ name: regex }, { genericName: regex }],
    })
      .limit(8)
      .sort({ name: 1 });

    // 3. If nothing useful came back locally, ask Claude to correct spelling / map brand->generic
    let aiSuggestion = null;
    if (patientHistory.length === 0 && catalogMatches.length === 0 && process.env.ANTHROPIC_API_KEY) {
      try {
        const allNames = await Medicine.find().limit(150).select('name genericName -_id');
        const catalogList = allNames.map((m) => `${m.name}${m.genericName ? ` (${m.genericName})` : ''}`);
        aiSuggestion = await suggestMedicineMatch(q, catalogList);
      } catch (aiErr) {
        console.error('AI medicine match failed:', aiErr.message);
        // Fail silently — the search box just shows "no matches" rather than breaking the page
      }
    }

    res.json({ patientHistory, catalogMatches, aiSuggestion });
  } catch (err) {
    console.error('Medicine search error:', err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

module.exports = router;
