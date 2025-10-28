const OpenAI = require("openai");

exports.handler = async (event) => {
  try {
    const { goal, equipment, duration, focus } = JSON.parse(event.body || "{}");

    // --- Prüfen, ob API-Key gesetzt ist ---
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in environment." }),
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // --- Prompt an das AI-Modell ---
    const prompt = `
You are an experienced CrossFit coach. Generate a complete, structured WOD JSON.
Use the following details:

Goal: ${goal || "General fitness"}
Equipment: ${equipment && equipment.length > 0 ? equipment.join(", ") : "Bodyweight only"}
Duration: ${duration || "Around 20 minutes"}
Focus areas: ${focus && focus.length > 0 ? focus.join(", ") : "Full Body"}

Return only JSON in this structure:
{
  "wod": {
    "name": "Workout Title",
    "format": "AMRAP / For Time / EMOM",
    "duration": "10-20 minutes",
    "description": "Short description",
    "scalingOptions": {
      "rx": "RX version",
      "intermediate": "Scaled version"
    }
  },
  "cooldown": {
    "duration": "5-10 minutes",
    "stretches": [
      { "name": "Couch stretch", "duration": "30 sec each leg" },
      { "name": "Pigeon pose", "duration": "30 sec each side" }
    ]
  }
}`;

    // --- Anfrage an OpenAI ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content;

    // --- JSON sicher parsen ---
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = {
        error: "Invalid JSON from AI",
        raw: text,
        fallback: {
          wod: {
            name: "AI WOD Example",
            format: "AMRAP",
            duration: "15 minutes",
            description: "5 Rounds for AMRAP: 10 Burpees, 20 Air Squats, 200m Run",
            scalingOptions: {
              rx: "As described",
              intermediate: "Reduce rounds or reps by 50%",
            },
          },
          cooldown: {
            duration: "5 minutes",
            stretches: [
              { name: "Pigeon stretch", duration: "30 sec each side" },
              { name: "Couch stretch", duration: "30 sec each leg" },
            ],
          },
        },
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(json),
    };
  } catch (error) {
    console.error("OpenAI error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
