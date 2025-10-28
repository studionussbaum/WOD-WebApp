const OpenAI = require("openai");

exports.handler = async (event) => {
  console.log("📩 Incoming request to generateWod...");

  try {
    // ----------------------------
    // 1️⃣ Eingabedaten parsen
    // ----------------------------
    const { goal, equipment, duration, focus } = JSON.parse(event.body || "{}");

    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY in environment!");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in environment." }),
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ----------------------------
    // 2️⃣ Prompt vorbereiten
    // ----------------------------
    const prompt = `
You are an experienced CrossFit coach.

Create a complete, structured WOD (Workout of the Day) using the following details:

🏋️ Goal: ${goal || "General fitness"}
🧰 Equipment available: ${equipment && equipment.length ? equipment.join(", ") : "Bodyweight only"}
⏱ Duration: ${duration || "20 minutes"}
💪 Focus areas: ${focus && focus.length ? focus.join(", ") : "Full Body"}

⚙️ Rules:
- Always include the listed equipment.
- Focus on functional movements.
- Return ONLY valid JSON — no commentary or markdown.

JSON structure:
{
  "wod": {
    "name": "Workout Title",
    "format": "AMRAP / For Time / EMOM",
    "duration": "10-20 minutes",
    "description": "Short description",
    "movements": ["Movement 1", "Movement 2", "Movement 3"],
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
}
`;

    // ----------------------------
    // 3️⃣ Anfrage an OpenAI senden
    // ----------------------------
    console.log("🧠 Sending prompt to OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty response from OpenAI.");

    console.log("✅ Raw AI response received.");

    // ----------------------------
    // 4️⃣ JSON sicher parsen + Fallback
    // ----------------------------
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.warn("⚠️ Invalid JSON from AI — using fallback.");
      json = {
        error: "Invalid JSON from AI",
        raw: text,
        wod: {
          name: "Fallback WOD",
          format: "AMRAP",
          duration: "15 minutes",
          description: "5 Rounds: 10 Burpees, 20 Air Squats, 200 m Run",
          movements: ["Burpees", "Air Squats", "Run"],
          scalingOptions: {
            rx: "As described",
            intermediate: "Reduce rounds or reps by 30%",
          },
        },
        cooldown: {
          duration: "5 minutes",
          stretches: [
            { name: "Pigeon Pose", duration: "30 sec each side" },
            { name: "Couch Stretch", duration: "30 sec each leg" },
          ],
        },
      };
    }

    // ----------------------------
    // 5️⃣ Erfolgsausgabe
    // ----------------------------
    console.log("🎯 WOD generation successful.");
    return {
      statusCode: 200,
      body: JSON.stringify(json),
    };
  } catch (error) {
    // ----------------------------
    // 6️⃣ Fehlerbehandlung
    // ----------------------------
    console.error("🔥 Server error in generateWod:", error);
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: "Server error: " + (error.message || "Unknown issue"),
      }),
    };
  }
};
