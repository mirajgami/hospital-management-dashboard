/**
 * AI-assisted medicine name matching.
 * Used as a fallback when the fast local (regex/text-index) search on the
 * Medicine catalog finds nothing useful — e.g. the doctor typed a misspelled
 * name, a brand name not in the catalog, or a generic name instead of a brand.
 *
 * Claude is given the raw input plus a shortlist of catalog names and asked
 * to either match it to one of them or propose the corrected/standard name.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/**
 * @param {string} query - raw text typed by staff, e.g. "paracetmol", "tylenol"
 * @param {string[]} catalogNames - up to ~150 "name (genericName)" strings from the Medicine collection, for grounding
 * @returns {Promise<{matchedName: string|null, correctedQuery: string, isNewMedicine: boolean, note: string}>}
 */
async function suggestMedicineMatch(query, catalogNames = []) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in .env');
  }
  if (!query || !query.trim()) {
    throw new Error('query is required');
  }

  const systemPrompt = `You help hospital staff find the right medicine name while typing into a search box, correcting typos and mapping brand names to generics.
You will be given the text they typed and a list of medicine names that exist in this hospital's catalog.

Respond with ONLY a JSON object (no markdown, no preamble) in this exact shape:
{"matchedName": string or null, "correctedQuery": string, "isNewMedicine": boolean, "note": string}

Rules:
- "matchedName" must be an EXACT string from the provided catalog list if one is a clear match (accounting for typos, brand vs generic name, or partial names). Otherwise null.
- "correctedQuery" is the spelling-corrected version of what they typed (proper medicine name capitalization), even if it's not in the catalog.
- "isNewMedicine" is true only if you're confident this is a real medicine name but it is NOT in the provided catalog list.
- "note" is one short sentence (under 15 words) for hospital staff, e.g. "Matched to catalog item" or "Not in catalog — brand name for Paracetamol".
- Never suggest a dosage or treatment recommendation. This is a name-lookup tool only, not clinical advice.`;

  const catalogBlock = catalogNames.length
    ? catalogNames.join('\n')
    : '(catalog is empty)';

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
      messages: [
        {
          role: 'user',
          content: `Typed text: "${query.trim()}"\n\nCatalog:\n${catalogBlock}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('Claude API returned no text content');

  const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Could not parse Claude's response as JSON: ${cleaned}`);
  }

  return {
    matchedName: parsed.matchedName || null,
    correctedQuery: parsed.correctedQuery || query.trim(),
    isNewMedicine: !!parsed.isNewMedicine,
    note: parsed.note || '',
  };
}

module.exports = { suggestMedicineMatch };
