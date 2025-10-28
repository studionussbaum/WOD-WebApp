const OpenAI = require("openai");

exports.handler = async (event) => {
  console.log("📩 Incoming request to generateWod...");

  try {
    const { goal, equipment, duration, focus } = JSON.parse(event.body || "{}");

    // --- Sicherheits-Check für API-Key ---
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OpenAI API Key!");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in environment." }),
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- Prompt mit klarer Equipment-Verwendung ---
    const prompt = `
You are an experienced CrossFit coach.

Create a complete WOD (Workout of the Day) using the following details:

🏋️ Goal: ${goal || "General Fitness"}
🧰 Equipment available: ${equipment && equipment.length ? equipment.join(", ") : "Bodyweight only"}
⏱ Duration: ${duration || "20 minutes"}
💪 Focus areas: ${focus && focus.length ? focus.join(", ") : "Full Body"}

⚙️ Rules:
- Always include the listed equipment.
- Return ONLY valid JSON in this structure (no explanation text!):

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

    console.log("🧠 Sending prompt to OpenAI...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty response from OpenAI");

    console.log("✅ Raw AI response received.");

    // --- JSON Parsing mit Fallback ---
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.warn("⚠️ AI returned invalid JSON. Using fallback.");
      json = {
        error: "Invalid JSON from AI",
        raw: text,
        wod: {
          name: "Fallback WOD",
          format: "AMRAP",
          duration: "15 minutes",
          description: "5 Rounds of 10 Burpees, 20 Squats, 200m Run",
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

    console.log("🎯 WOD generation successful.");
    return {
      statusCode: 200,
      body: JSON.stringify(json),
    };
