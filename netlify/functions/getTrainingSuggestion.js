import OpenAI from "openai";

// --- OpenAI global initialisieren ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handler(event) {
  try {
    const { workouts } = JSON.parse(event.body || "{}");

    // --- Input prüfen ---
    if (!workouts || !Array.isArray(workouts)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid or missing workouts array" }),
      };
    }

    const workoutHistory = workouts
      .map((w) => `Date: ${w.date}, Type: ${w.type}, Title: ${w.title}`)
      .join("\n");

    // --- Prompt vorbereiten ---
    const prompt = `
You are an experienced AI fitness coach. Analyze the user's recent workouts
and suggest what type of training they should do next.

Options:
- Rest
- Strength
- Endurance/Metcon

Be short, motivational, and directly actionable.
Example:
"Recommendation: Strength — You’ve had two cardio sessions this week, time to lift heavy!"

Workout history:
${workoutHistory}
`;

    // --- Anfrage an OpenAI ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();

    // --- Fallback bei leerer oder fehlerhafter Antwort ---
    const suggestion =
      text && text.length > 0
        ? text
        : "Recommendation: Rest — You've been pushing hard. Take a day to recover and come back stronger!";

    return {
      statusCode: 200,
      body: JSON.stringify({ suggestion }),
    };
  } catch (error) {
    console.error("❌ Error generating training suggestion:", error);

    // --- Sauberer Fehler-Response ---
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to generate training suggestion.",
        hint:
          "Make sure OPENAI_API_KEY is defined in Netlify → Site Settings → Environment Variables.",
      }),
    };
  }
}
