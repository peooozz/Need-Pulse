# NeedPulse

NeedPulse is a WhatsApp-first AI platform built for the GDG Solution Challenge. It uses Gemini AI and Firebase to process multilingual field reports, extract intelligence, and automatically match needs with nearby volunteers using a scoring algorithm.

## Features
- **WhatsApp Simulator**: A complete demo simulator for testing AI processing and routing.
- **Gemini AI Integration**: Extracts intelligence from multilingual text, audio, and image field reports.
- **Volunteer Matching**: Intelligent dispatch system using skills, availability, and Haversine distance scoring.
- **Graceful Fallbacks**: Smart regex and keyword fallback engine allowing the app to run seamlessly even without API keys.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Add your API keys to `.env.local` to enable live Gemini AI processing.

See `docs/implementation_plan.md` for a complete architecture overview.
