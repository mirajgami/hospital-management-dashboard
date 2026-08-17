/**
 * Smart Symptom Triage
 * Sends a patient's free-text "reason for visit" to Claude and asks it to
 * suggest a department and urgency level, so receptionists can route the
 * appointment to the right doctor faster.
 *
 * Requires ANTHROPIC_API_KEY in .env. Get one at https://console.anthropic.com
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/**
 * @param {string} reasonText - free text reason/symptoms entered by staff
 * @param {string[]} availableDepartments - department names that actually exist in this hospital
 * @returns {Promise<{department: string, urgency: string, reasoning: string}>}
 */
async function triageSymptoms(reasonText, availableDepartments = []) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env');
  }
  if (!reasonText || !reasonText.trim()) {
    throw new Error('reasonText is required');
  }

  const departmentList = availableDepartments.length
    ? availableDepartments.join(', ')
    : 'General Medicine, Cardiology, Pediatrics, Orthopedics, Neurology, ENT, Dermatology, Gynecology, Emergency';

  const systemPrompt = `You are a clinical triage assistant for a hospital's front-desk software.
Given a patient's stated reason for visit, respond with ONLY a JSON object (no markdown, no preamble) in this exact shape:
{"department": string, "urgency": "Low" | "Medium" | "High" | "Emergency", "reasoning": string}

Rules:
- "department" must be chosen from this list of departments that exist at this hospital: ${departmentList}. If nothing fits well, use "General Medicine".
- "urgency" reflects how quickly the patient should be seen: Low (routine/checkup), Medium (should be seen same week), High (should be seen same day), Emergency (needs immediate attention - chest pain, difficulty breathing, severe bleeding, stroke symptoms, loss of consciousness, etc).
- "reasoning" is one short sentence (under 20 words) explaining the suggestion, in plain language for hospital staff.
- This is a routing suggestion only, not a diagnosis. Never suggest a specific medication or treatment.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Reason for visit: "${reasonText.trim()}"` }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('Claude API returned no text content');
  }

  const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Could not parse Claude's response as JSON: ${cleaned}`);
  }

  const validUrgencies = ['Low', 'Medium', 'High', 'Emergency'];
  if (!validUrgencies.includes(parsed.urgency)) {
    parsed.urgency = 'Medium';
  }

  return {
    department: parsed.department || 'General Medicine',
    urgency: parsed.urgency,
    reasoning: parsed.reasoning || '',
  };
}

module.exports = { triageSymptoms };
