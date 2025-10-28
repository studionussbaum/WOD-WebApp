const OpenAI = require("openai");

exports.handler = async (event) => {
  try {
    const { goal, equipment, duration, focus } = JSON.parse(event.body || "{}");

    // --- Sicherstellen, dass der API Key gesetzt ist ---
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in environment." }),
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // --- Der Prompt an das Modell ---
    const prompt = `
You are an experienced CrossFit coach. Generate a complete structured WOD (Workout of the Day) in pure JSON.
Only return JSON — no explanations, no Markdown, no text before or after.

Parameters:
Goal: ${goal || "General fitness"}
Equipment: ${equipment && equipment.length > 0 ? equipment.join(", ") : "Bodyweight only"}
Duration: ${duration || "Around 20 minutes"}
Focus areas: ${focus && focus.length > 0 ? focus.join(", ") : "Full body"}

JSON structure:
{
  "wod": {
    "name": "Workout Title",
    "format": "AMRAP / For Time / EMOM",
    "duration": "10–20 minutes",
    "description": "Short description of the workout",
    "scalingOptions": {
      "rx": "RX version",
      "intermediate": "Scaled version"
    }
  },
  "co
