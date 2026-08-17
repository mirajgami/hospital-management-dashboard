/**
 * AI Patient Summary — condenses a patient's medical history, recent visits,
 * and prescription history into a short clinical brief for quick reference.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/**
 * @param {object} patient - Patient document (name, age, gender, medicalHistory, bloodGroup)
 * @param {object[]} appointments - recent Appointment docs (populated with doctor)
 * @param {object[]} prescriptions - recent Prescription docs
 * @returns {Promise<string>} - short plain-text clinical summary
 */
async function summarizePatient(patient, appointments = [], prescriptions = []) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env');
  }

  const visitLines = appointments
    .slice(0, 10)
    .map((a) => `- ${new Date(a.date).toLocaleDateString()}: seen by Dr. ${a.doctor?.name || 'N/A'} (${a.doctor?.specialization || 'N/A'}) — reason: ${a.reason || 'n/a'} — status: ${a.status}${a.notes ? ` — notes: ${a.notes}` : ''}`)
    .join('\n');

  const medicineLines = prescriptions
    .slice(0, 20)
    .map((p) => `- ${new Date(p.date).toLocaleDateString()}: ${p.medicineName} ${p.dosage || ''} ${p.frequency || ''}`.trim())
    .join('\n');

  const systemPrompt = `You are a clinical documentation assistant. Summarize the patient record below into a short brief for a doctor who is about to see this patient.
Respond in plain text (no markdown headers, no JSON), maximum 120 words, organized as 3 short labeled lines: "Profile:", "History:", "Pattern:".
- "Profile" is one line: age, gender, blood group.
- "History" summarizes medicalHistory field and any recurring visit reasons.
- "Pattern" notes anything relevant staff should know at a glance (e.g. frequent visits, recurring prescriptions, any notable gaps) — factual only.
Never invent facts not present in the data. Never suggest a diagnosis, medication, or treatment change — this is a summary of existing records only, not medical advice.`;

  const userContent = `Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}, Blood Group: ${patient.bloodGroup || 'unknown'}
Medical History on file: ${patient.medicalHistory || 'none recorded'}

Recent visits:
${visitLines || 'none recorded'}

Recent prescriptions:
${medicineLines || 'none recorded'}`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('Claude API returned no text content');

  return textBlock.text.trim();
}

module.exports = { summarizePatient };
