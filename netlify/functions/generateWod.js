import OpenAI from "openai";

// 👇 OpenAI-Client wird global initialisiert (wichtig für Netlify!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handler(event) {
  try {
    // Eingabedaten aus dem Request lesen
    const { goal, equipment, duration, focus } = JSON.parse(event.body || "{}");

    // Prompt für das Workout
    const prompt = `
You are a professional CrossFit coach. Create a workout (WOD) based on:
Goal: ${goal}
Equipment: ${equipment && equipment.length > 0 ? equipment.join(", ") : "bodyweight only"}
Duration: ${duration || "20"} minutes
Focus areas: ${focus && focus.length > 0 ? focus.join(", ") : "full body"}

Return a JSON response with this structure:
{
  "name": "Workout Title",
  "format": "AMRAP / For Time / EMOM",
  "duration": "10 minutes",
  "description": "Detailed breakdown of the workout",
  "rx": "RX standards for advanced athletes",
  "intermediate": "Scaled version for intermediate athletes",
  "cooldown": "Short cooldown routine"
}
`;

    // Anfrage an OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    // Antworttext extrahieren
    const result = completion.choices[0].message.content.trim();

    // Versuch, JSON aus Text zu parsen
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { raw: result };
    }

    // Erfolgreiche Antwort zurückgeben
    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
    };
  } catch (error) {
    console.error("❌ OpenAI Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        hint:
          "Make sure OPENAI_API_KEY is defined in Netlify → Site Settings → Environment Variables.",
      }),
    };
  }
}
