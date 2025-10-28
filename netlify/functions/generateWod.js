// netlify/functions/generateWod.js
const OpenAI = require("openai");

exports.handler = async (event) => {
  console.log("📩 generateWod called");

  try {
    const { goal, equipment, duration, focus } = JSON.parse(event.body || "{}");

    // --- Prüfen, ob API-Key gesetzt ist ---
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in environment." }),
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ---------- KOMBINIERTER PROMPT (Warmup + WOD + Cooldown) ----------
    const combinedPrompt = `
You are an experienced CrossFit coach. 
Create a complete, structured training session that includes:
1️⃣ Warm-up
2️⃣ Main WOD (Workout of the Day)
3️⃣ Cooldown

💬 USER INPUT:
- Goal: ${goal || "General fitness"}
- Equipment available: ${Array.isArray(equipment) && equipment.length ? equipment.join(", ") : "Bodyweight only"}
- Duration: ${duration || "20 minutes"}
- Focus areas: ${Array.isArray(focus) && focus.length ? focus.join(", ") : "Full Body"}

🎯 RULES:
- Warm-up must prepare the same muscle groups and movement patterns used in the WOD.
- Use every available equipment item in at least one section (warmup or wod). 
- The WOD "description" MUST start with a clear one-line instruction describing the entire workout format and scheme.
- Scaling options (rx and intermediate) MUST include exact numbers (kg, reps, calories, etc.).
- Return ONLY a valid JSON (no markdown, no commentary).

⚙️ OUTPUT FORMAT:
{
  "warmup": {
    "description": "Short purpose summary",
    "duration": "string (e.g., '8 minutes')",
    "rounds": "string (e.g., '2 rounds')",
    "details": [
      "1 min ${equipment.includes("Assault Bike") ? "Assault Bike (easy pace)" : "light cardio"}",
      "10 ${equipment.includes("Kettlebell") ? "Kettlebell Swings" : "Air Squats"}",
      "10 ${equipment.includes("Medicine Ball") ? "Wall Balls" : "Push-ups"}",
      "Dynamic stretches for ${focus.join(", ")}"
    ]
  },
  "wod": {
    "name": "Workout Title",
    "format": "AMRAP | For Time | EMOM",
    "duration": "string (e.g., '22 minutes' or '4 rounds for time, cap 22')",
    "description": "ONE single structured instruction line for the full workout",
    "movements": [
      { "name": "string", "reps": "string or number", "load": "kg/cal/height", "equipment": ["string"] }
    ],
    "scalingOptions": {
      "rx": "Concrete RX scheme with exact kg/heights/calories",
      "intermediate": "Concrete scaled scheme with exact kg/heights/calories"
    }
  },
  "cooldown": {
    "duration": "string (e.g., '5 minutes')",
    "stretches": [
      { "name": "string", "duration": "string" },
      { "name": "string", "duration": "string" }
    ]
  }
}
`;

    // ---------- OpenAI-Aufruf ----------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "user", content: combinedPrompt }],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    if (!raw) throw new Error("Empty response from OpenAI.");

    // ---------- robustes JSON Parsing ----------
    let result;
    try {
      result = JSON.parse(raw);
    } catch (e) {
      console.warn("⚠️ AI returned non-JSON. Returning fallback with raw text.");
      return {
        statusCode: 200,
        body: JSON.stringify({
          error: "Invalid JSON from AI",
          raw,
          warmup: {
            description: "Activate legs and shoulders for endurance.",
            duration: "8 minutes",
            rounds: "2 rounds",
            details: [
              "1 min light Assault Bike",
              "10 Air Squats",
              "10 Kettlebell Swings",
              "Dynamic lunges"
            ]
          },
          wod: {
            name: "Fallback WOD",
            format: "AMRAP",
            duration: duration || "20 minutes",
            description:
              "AMRAP (" +
              (duration || "20 minutes") +
              "): 12 Kettlebell Swings @ 24/16kg, 15 Wall Balls (Medicine Ball) @ 9/6kg, 18/14 cal Assault Bike",
            movements: [
              { name: "Kettlebell Swings", reps: "12", load: "24/16kg", equipment: ["Kettlebell"] },
              { name: "Wall Balls", reps: "15", load: "9/6kg", equipment: ["Medicine Ball"] },
              { name: "Assault Bike", reps: "cal", load: "18/14 cal", equipment: ["Assault Bike"] }
            ],
            scalingOptions: {
              rx: "As listed above.",
              intermediate:
                "Kettlebell Swings @ 16/12kg; Wall Balls @ 6/4kg; Assault Bike 14/10 cal",
            },
          },
          cooldown: {
            duration: "5 minutes",
            stretches: [
              { name: "Pigeon Pose", duration: "30 sec each side" },
              { name: "Couch Stretch", duration: "30 sec each leg" }
            ],
          },
        }),
      };
    }

    // ---------- Validierung & Auto-Korrektur ----------
    const wod = result?.wod || {};
    if (!wod.description || !/^(AMRAP|For Time|EMOM)/i.test(wod.description)) {
      const head =
        (wod.format ? wod.format : "AMRAP") +
        " — " +
        (wod.duration || duration || "20 minutes") +
        (Array.isArray(wod.movements) && wod.movements.length
          ? ": " +
            wod.movements
              .map((m) => {
                const rep = m.reps ?? "?";
                const load = m.load ? ` @ ${m.load}` : "";
                return `${rep} ${m.name}${load}`;
              })
              .join(", ")
          : "");
      wod.description = head.trim();
      result.wod = wod;
    }

    // Bewegungen fallbacken, wenn leer
    if (!Array.isArray(wod.movements) || wod.movements.length === 0) {
      result.wod.movements = (Array.isArray(equipment) ? equipment : []).map((eq) => ({
        name: eq,
        reps: eq === "Assault Bike" ? "cal" : "12",
        load: eq === "Assault Bike" ? "Calories (e.g., 18/14)" : "as appropriate",
        equipment: [eq],
      }));
    }

    // Scaling absichern
    if (!wod.scalingOptions || !wod.scalingOptions.rx || !wod.scalingOptions.intermediate) {
      result.wod.scalingOptions = {
        rx: "Provide exact numbers for reps, kg, heights, and calories.",
        intermediate: "Reduce loads by ~20–30% and calories by ~20%.",
      };
    }

    // Warmup-Fallback, falls fehlt
    if (!result.warmup) {
      result.warmup = {
        description: "General activation warm-up.",
        duration: "8 minutes",
        rounds: "2 rounds",
        details: [
          "1 min light cardio",
          "10 Air Squats",
          "10 Push-ups",
          "10 Lunges",
          "Dynamic stretches",
        ],
      };
    }

    // Cooldown-Fallback, falls fehlt
    if (!result.cooldown) {
      result.cooldown = {
        duration: "5 minutes",
        stretches: [
          { name: "Pigeon Pose", duration: "30 sec each side" },
          { name: "Couch Stretch", duration: "30 sec each leg" },
        ],
      };
    }

    // ---------- Response ----------
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("🔥 generateWod error:", error);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Server error: " + (error.message || "Unknown") }),
    };
  }
};
