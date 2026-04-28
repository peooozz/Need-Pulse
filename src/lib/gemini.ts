/* ============================================
   NeedPulse — Gemini AI Processing Pipeline
   Used to intelligently analyze the user's problem description
   and extract structured emergency data.
   ============================================ */

import type { NeedCategory, Sentiment } from './types';

/* ---------- Check if Gemini is configured ---------- */
export function isGeminiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 0);
}

/* ---------- Extraction result from Gemini ---------- */
export interface ProblemExtraction {
  category: NeedCategory;
  subcategory: string;
  urgency: number;
  sentiment: Sentiment;
  summaryEn: string;
  summaryOriginal: string;
  detectedLanguage: string;
  keyDetails: string[];
  confidence: number;
  /** Gemini generates 1-2 smart follow-up questions relevant to this specific emergency */
  followUpQuestions: string[];
}

const EXTRACTION_PROMPT = `You are NeedPulse AI, a disaster response intelligence engine. Analyze the following emergency report from a WhatsApp user and extract structured data.

The user has already told you their language preference and described their problem. Your job is to classify and analyze.

RESPOND ONLY IN VALID JSON with these exact keys:
{
  "category": "food" | "water" | "shelter" | "medical" | "education" | "infrastructure" | "other",
  "subcategory": "string — specific need type e.g. drinking_water, first_aid, flood_rescue",
  "urgency": number 1-10 (10 = life-threatening),
  "sentiment": "desperate" | "urgent" | "moderate" | "informational",
  "summaryEn": "one-line English summary of the emergency",
  "summaryOriginal": "one-line summary in user's original language",
  "detectedLanguage": "ISO 639-1 code (hi, te, ta, en, etc.)",
  "keyDetails": ["array of 2-4 specific actionable details"],
  "confidence": number 0.0-1.0,
  "followUpQuestions": ["1-2 important follow-up questions relevant to THIS emergency type, written in the user's language. For medical: ask about injuries/elderly/children. For flood: ask about water level/trapped people. For food: ask about babies needing formula. Make them empathetic and specific."]
}

Urgency guide: 10=Immediate life threat, 8-9=Critical, 6-7=High, 4-5=Moderate, 1-3=Low.
Always respond with ONLY the JSON object. No markdown, no explanation.`;

/* ---------- Analyze a problem description via Gemini ---------- */
export async function analyzeProblem(
  problemText: string,
  userLanguage: string
): Promise<ProblemExtraction> {
  if (!isGeminiConfigured()) {
    console.log('ℹ️ Gemini API key not configured — using keyword extraction');
    return keywordExtraction(problemText);
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY!;

    const userPrompt = `User's preferred language: ${userLanguage}\n\nEmergency description: "${problemText}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${EXTRACTION_PROMPT}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const extraction = JSON.parse(cleanText) as ProblemExtraction;

    return {
      category: validateCategory(extraction.category),
      subcategory: extraction.subcategory || 'general',
      urgency: Math.max(1, Math.min(10, Math.round(extraction.urgency ?? 5))),
      sentiment: validateSentiment(extraction.sentiment),
      summaryEn: extraction.summaryEn || problemText.substring(0, 100),
      summaryOriginal: extraction.summaryOriginal || problemText.substring(0, 100),
      detectedLanguage: extraction.detectedLanguage || 'en',
      keyDetails: Array.isArray(extraction.keyDetails) ? extraction.keyDetails : [],
      confidence: Math.max(0, Math.min(1, extraction.confidence || 0.7)),
      followUpQuestions: Array.isArray(extraction.followUpQuestions) ? extraction.followUpQuestions.slice(0, 2) : [],
    };
  } catch (error) {
    console.error('Gemini processing error:', error);
    return keywordExtraction(problemText);
  }
}

/* ---------- Keyword-based fallback extraction ---------- */
function keywordExtraction(message: string): ProblemExtraction {
  const lowerMsg = message.toLowerCase();

  let category: NeedCategory = 'other';
  let subcategory = 'general';
  let urgency = 5;
  let sentiment: Sentiment = 'moderate';
  let followUpQuestions: string[] = [];

  if (/water|पानी|నీరు|jal|paani|drink|well|bore|contaminated|flood/.test(lowerMsg)) {
    category = 'water';
    subcategory = 'drinking_water';
    urgency = 8;
    sentiment = 'urgent';
    followUpQuestions = ['Is the water contaminated or is there no water at all?', 'Are there children or elderly who need water urgently?'];
  } else if (/medic|doctor|hospital|sick|ill|disease|दवा|बीमार|health|injury|medicine/.test(lowerMsg)) {
    category = 'medical';
    subcategory = 'medical_attention';
    urgency = 8;
    sentiment = 'urgent';
    followUpQuestions = ['Are there children, pregnant women, or elderly affected?', 'Is anyone critically injured or bleeding?'];
  } else if (/food|hunger|rice|dal|ration|kitchen|भोजन|खाना|starving|meal/.test(lowerMsg)) {
    category = 'food';
    subcategory = 'food_supply';
    urgency = 7;
    sentiment = 'urgent';
    followUpQuestions = ['Are there infants who need baby formula or milk?', 'How long has it been since people have eaten?'];
  } else if (/shelter|house|home|displaced|roof|tent|आश्रय|मकान|collapse/.test(lowerMsg)) {
    category = 'shelter';
    subcategory = 'emergency_housing';
    urgency = 8;
    sentiment = 'desperate';
    followUpQuestions = ['Are people currently exposed to rain or extreme weather?', 'Are there any injured people who cannot move?'];
  } else if (/school|book|teacher|student|education/.test(lowerMsg)) {
    category = 'education';
    subcategory = 'school_supplies';
    urgency = 4;
    sentiment = 'moderate';
    followUpQuestions = ['How many students are affected?', 'What specific supplies are needed?'];
  } else if (/road|bridge|electric|power|infrastructure|सड़क|बिजली/.test(lowerMsg)) {
    category = 'infrastructure';
    subcategory = 'road_repair';
    urgency = 6;
    sentiment = 'moderate';
    followUpQuestions = ['Is anyone trapped or stranded due to the infrastructure damage?', 'Is this blocking access to emergency services?'];
  } else {
    followUpQuestions = ['Can you describe more about what happened?', 'Is anyone in immediate danger?'];
  }

  if (/emergency|urgent|dying|death|immediate|critical|desperate|बहुत|जल्दी|तुरंत/.test(lowerMsg)) {
    urgency = Math.min(10, urgency + 2);
    sentiment = 'desperate';
  }

  let detectedLanguage = 'en';
  if (/[\u0900-\u097F]/.test(message)) detectedLanguage = 'hi';
  else if (/[\u0C00-\u0C7F]/.test(message)) detectedLanguage = 'te';
  else if (/[\u0B80-\u0BFF]/.test(message)) detectedLanguage = 'ta';

  return {
    category,
    subcategory,
    urgency,
    sentiment,
    summaryEn: message.length > 80 ? message.substring(0, 80) + '...' : message,
    summaryOriginal: message,
    detectedLanguage,
    keyDetails: [`Category: ${category}`],
    confidence: 0.65,
    followUpQuestions,
  };
}

/* ---------- Validation Helpers ---------- */
const VALID_CATEGORIES: NeedCategory[] = ['food', 'water', 'shelter', 'medical', 'education', 'infrastructure', 'other'];
const VALID_SENTIMENTS: Sentiment[] = ['desperate', 'urgent', 'moderate', 'informational'];

function validateCategory(cat: string): NeedCategory {
  return VALID_CATEGORIES.includes(cat as NeedCategory) ? (cat as NeedCategory) : 'other';
}

function validateSentiment(sent: string): Sentiment {
  return VALID_SENTIMENTS.includes(sent as Sentiment) ? (sent as Sentiment) : 'moderate';
}

// Keep backward-compat export for any other importers
export { analyzeProblem as processFieldReport };
