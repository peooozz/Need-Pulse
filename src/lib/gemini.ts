/* ============================================
   NeedPulse — Gemini AI Processing Pipeline
   Handles text, voice, and image field reports
   Falls back to mock extraction if API key is missing
   ============================================ */

import type { GeminiExtraction, NeedCategory, Sentiment } from './types';

/* ---------- Check if Gemini is configured ---------- */
export function isGeminiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 0);
}

/* ---------- System Prompt (the secret sauce) ---------- */
const SYSTEM_PROMPT = `You are NeedPulse AI, an expert at analyzing field reports from NGO workers in India.

Given the following field report (which may be in any language), extract structured intelligence.

RESPOND ONLY IN VALID JSON with these exact keys:
{
  "category": "food" | "water" | "shelter" | "medical" | "education" | "infrastructure" | "other",
  "subcategory": "string — specific need type e.g. drinking_water, first_aid, school_supplies",
  "urgency": number 1-10 (10 = life-threatening emergency),
  "peopleAffected": number (estimated, be conservative),
  "location": "string — any location mentions (village, district, landmark, city)",
  "summaryEn": "string — one-line English summary of the need",
  "summaryOriginal": "string — one-line summary in the original language of the report",
  "detectedLanguage": "string — ISO 639-1 code (hi, te, ta, en, etc.)",
  "sentiment": "desperate" | "urgent" | "moderate" | "informational",
  "keyDetails": ["array of specific actionable details extracted from the report"],
  "confidence": number 0.0-1.0 (how confident you are in the extraction accuracy)
}

Guidelines for urgency scoring:
- 10: Immediate life threat (ongoing disaster, medical emergency with casualties)
- 8-9: Critical (water contamination with sick children, displacement, no shelter)
- 6-7: High (medicine shortage, food running out, structural damage)
- 4-5: Moderate (educational needs, non-urgent infrastructure)
- 1-3: Low (informational reports, minor requests)
- 0: Conversational/Greeting (e.g., "hi", "hello", "how are you", or a general "help" with no context). For these, set category to "other" and peopleAffected to 0.

Always respond with ONLY the JSON object, no markdown, no explanation.`;

/* ---------- Process a field report via Gemini API ---------- */
export async function processFieldReport(
  message: string,
  mediaType: 'text' | 'voice' | 'image' = 'text',
  mediaData?: { mimeType: string; data: string }
): Promise<GeminiExtraction> {
  const lowerMsg = message.toLowerCase().trim();

  // 1. Early interception for purely conversational greetings to save API calls
  // Matches "hi", "hii", "hello", "helo", "hey", etc. with optional trailing punctuation
  const greetingRegex = /^(hi+|helo+|hello+|hey+|namaste|नमस्ते|నమస్తే|help|please help|testing|test)[.!?\s]*$/i;
  
  if (!mediaData && greetingRegex.test(lowerMsg)) {
    return {
      category: 'other',
      subcategory: 'greeting',
      urgency: 0,
      peopleAffected: 0,
      location: 'Unknown',
      summaryEn: message,
      summaryOriginal: message,
      detectedLanguage: 'en',
      sentiment: 'informational',
      keyDetails: [],
      confidence: 1.0,
    };
  }
  
  // If Gemini is not configured, return a mock extraction
  if (!isGeminiConfigured()) {
    console.log('ℹ️ Gemini API key not configured — using smart mock extraction');
    return generateSmartMockExtraction(message);
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY!;

    const mediaContext = mediaType === 'voice'
      ? '\n[This message was transcribed from a voice note]'
      : mediaType === 'image'
        ? '\n[This message was accompanied by a photo of the situation]'
        : '';

    const userPrompt = `Field report received via WhatsApp:${mediaContext}\n\n${message ? `"${message}"` : '[Audio attached]'}`;

    const parts: any[] = [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }];
    
    if (mediaData) {
      parts.push({
        inlineData: {
          mimeType: mediaData.mimeType,
          data: mediaData.data
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts,
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
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Extract the text content from Gemini's response
    const responseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the JSON response
    const extraction = JSON.parse(responseText) as GeminiExtraction;

    // Validate and clamp values
    return {
      category: validateCategory(extraction.category),
      subcategory: extraction.subcategory || 'general',
      urgency: Math.max(0, Math.min(10, Math.round(extraction.urgency ?? 5))),
      peopleAffected: Math.max(0, extraction.peopleAffected || 0),
      location: extraction.location || 'Unknown location',
      summaryEn: extraction.summaryEn || message.substring(0, 100),
      summaryOriginal: extraction.summaryOriginal || message.substring(0, 100),
      detectedLanguage: extraction.detectedLanguage || 'en',
      sentiment: validateSentiment(extraction.sentiment),
      keyDetails: Array.isArray(extraction.keyDetails) ? extraction.keyDetails : [extraction.summaryEn || message],
      confidence: Math.max(0, Math.min(1, extraction.confidence || 0.5)),
    };
  } catch (error) {
    console.error('Gemini processing error:', error);
    // Fallback to smart mock if API fails
    return generateSmartMockExtraction(message);
  }
}

/* ---------- Smart Mock Extraction (keyword-based fallback) ---------- */
function generateSmartMockExtraction(message: string): GeminiExtraction {
  const lowerMsg = message.toLowerCase();

  // Simple keyword-based classification
  let category: NeedCategory = 'other';
  let subcategory = 'general';
  let urgency = 5;
  let sentiment: Sentiment = 'moderate';

  // Greeting/Conversational keywords
  if (/^(hi|hello|hey|namaste|नमस्ते|నమస్తే|help|please help)$/.test(lowerMsg.trim())) {
    return {
      category: 'other',
      subcategory: 'greeting',
      urgency: 0,
      peopleAffected: 0,
      location: 'Unknown',
      summaryEn: message,
      summaryOriginal: message,
      detectedLanguage: 'en',
      sentiment: 'informational',
      keyDetails: [],
      confidence: 1.0,
    };
  }

  // Water-related keywords (including Hindi/Telugu transliteration)
  if (/water|पानी|నీరు|jal|paani|drink|well|bore|contaminated|flood/.test(lowerMsg)) {
    category = 'water';
    subcategory = 'drinking_water';
    urgency = 8;
    sentiment = 'urgent';
  }
  // Medical keywords
  else if (/medic|doctor|hospital|sick|ill|disease|दवा|बीमार|health|injury|medicine|diabetes/.test(lowerMsg)) {
    category = 'medical';
    subcategory = 'medical_attention';
    urgency = 7;
    sentiment = 'urgent';
  }
  // Food keywords
  else if (/food|hunger|rice|dal|ration|kitchen|भोजन|खाना|starving|meal|feeding/.test(lowerMsg)) {
    category = 'food';
    subcategory = 'food_supply';
    urgency = 7;
    sentiment = 'urgent';
  }
  // Shelter keywords
  else if (/shelter|house|home|displaced|flood|roof|tent|आश्रय|मकान|collapse/.test(lowerMsg)) {
    category = 'shelter';
    subcategory = 'emergency_housing';
    urgency = 8;
    sentiment = 'desperate';
  }
  // Education keywords
  else if (/school|book|teacher|student|education|పాఠశాల|विद्यालय|textbook|class/.test(lowerMsg)) {
    category = 'education';
    subcategory = 'school_supplies';
    urgency = 4;
    sentiment = 'moderate';
  }
  // Infrastructure keywords
  else if (/road|bridge|electric|power|infrastructure|सड़क|बिजली|damaged|broken|construction/.test(lowerMsg)) {
    category = 'infrastructure';
    subcategory = 'road_repair';
    urgency = 6;
    sentiment = 'moderate';
  }

  // Boost urgency for desperation keywords
  if (/emergency|urgent|dying|death|immediate|critical|desperate|बहुत|जल्दी|तुरंत/.test(lowerMsg)) {
    urgency = Math.min(10, urgency + 2);
    sentiment = 'desperate';
  }

  // Detect people count
  const numberMatch = message.match(/(\d+)\s*(people|families|persons|students|patients|children|लोग|परिवार|విద్యార్థులు)/i);
  const peopleAffected = numberMatch ? parseInt(numberMatch[1]) * (numberMatch[2].toLowerCase().includes('famil') ? 4 : 1) : 50;

  // Simple language detection
  let detectedLanguage = 'en';
  if (/[\u0900-\u097F]/.test(message)) detectedLanguage = 'hi';
  else if (/[\u0C00-\u0C7F]/.test(message)) detectedLanguage = 'te';
  else if (/[\u0B80-\u0BFF]/.test(message)) detectedLanguage = 'ta';
  else if (/[\u0980-\u09FF]/.test(message)) detectedLanguage = 'bn';
  else if (/[\u0A80-\u0AFF]/.test(message)) detectedLanguage = 'gu';
  else if (/[\u0C80-\u0CFF]/.test(message)) detectedLanguage = 'kn';

  return {
    category,
    subcategory,
    urgency,
    peopleAffected,
    location: 'Detected from report',
    summaryEn: message.length > 80 ? message.substring(0, 80) + '...' : message,
    summaryOriginal: message.length > 80 ? message.substring(0, 80) + '...' : message,
    detectedLanguage,
    sentiment,
    keyDetails: [`Category: ${category}`, `Estimated ${peopleAffected} people affected`],
    confidence: 0.75,
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
