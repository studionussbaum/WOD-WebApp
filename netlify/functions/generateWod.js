// netlify/functions/generateWod.js
const OpenAI = require("openai");

exports.handler = async (event) => {
  console.log("📩 generateWod called");

  try {
    const { goal, equipment, duration, focus, selectedTypes = [] } = JSON.parse(event.body || "{}");

    // --- Prüfen, ob API-Key gesetzt ist ---
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in environment." }),
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 🧠 Dynamischer Abschnittsaufbau
    const chosenSections = [];
    if (selectedTypes.includes("strength")) chosenSections.push("1️⃣ Strength Part (Skill/Strength Work)");
    if (selectedTypes.includes("metcon")) chosenSections.push("2️⃣ Metcon (Conditioning)");
    if (selectedTypes.includes("endurance")) chosenSections.push("3️⃣ Endurance Session");
    if (selectedTypes.includes("hiit")) chosenSections.push("4️⃣ HIIT Session");

    const selectedText = chosenSections.length
      ? chosenSections.join("\n")
      : "1️⃣ Metcon (Main Conditioning Workout)";

    const targetDuration = Number(duration) || 20;

    // ---------- PROMPT ----------
    const prompt = `
You are an experienced CrossFit coach and workout designer.
Interpret the USER GOAL precisely and create a structured training plan around it.

🔥 MAIN GOAL:
"${goal || "General fitness"}"

🏋️‍♂️ Additional context:
- Equipment available: ${Array.isArray(equipment) && equipment.length ? equipment.join(", ") : "Bodyweight only"}
- Target conditioning duration: ${targetDuration} minutes (±5 minutes tolerance)
- Focus areas: ${Array.isArray(focus) && focus.length ? focus.join(", ") : "Full Body"}
- Requested sections: ${selectedText}

🧠 COACHING RULES:
- Only the *conditioning section* (Metcon, Endurance or HIIT) must match ${targetDuration - 5}–${targetDuration + 5} minutes.
- Warm-up, Strength and Cooldown are **excluded** from this rule.
- Estimate conditioning duration:
  • 2–3 s per bodyweight rep
  • 3–4 s per burpee
  • 45 s per 200 m run or 10 cal bike
- Warm-up should target similar movement patterns as the main workout.
- Provide RX and Intermediate scaling.
- All time caps realistic.
- DO NOT create fields like "mainWOD" or "workout" — always use one of:
  → "strength", "metcon", "endurance", "hiit"
- Output **ONLY valid JSON** (no markdown, no comments).

⚙️ JSON OUTPUT FORMAT:
{
  "warmup": {
    "description": "Short overview",
    "duration": "string",
    "rounds": "string",
    "details": ["movement list"]
  },
  ${selectedTypes.includes("strength") ? `"strength": {
    "focus": "e.g. Front Squat",
    "sets": "e.g. 5x5",
    "load": "kg or % of 1RM",
    "duration": "string",
    "description": "coaching cue"
  },` : ""}
  "metcon": {
    "name": "Workout Title",
    "format": "AMRAP | For Time | EMOM",
    "targetDuration": ${targetDuration},
    "actualDuration": "number (minutes)",
    "description": "Full single-line instruction with reps, rounds, and loads",
    "movements": [
      { "name": "string", "reps": "number or pattern", "load": "kg/cal", "equipment": ["string"] }
    ],
    "scalingOptions": {
      "rx": "RX version details",
      "intermediate": "scaled version details"
    }
  },
  ${selectedTypes.includes("endurance") ? `"endurance": {
    "description": "structured long session (e.g., 3 rounds of 1 km Row, 400m Run, 30 Air Squats)",
    "targetDuration": ${targetDuration},
    "actualDuration": "number (minutes)",
    "intensity": "e.g. 70–80% pace"
  },` : ""}
  ${selectedTypes.includes("hiit") ? `"hiit": {
    "description": "interval workout (e.g., 8x 20s work / 10s rest alternating Assault Bike & Burpees)",
    "targetDuration": ${targetDuration},
    "actualDuration": "number (minutes)",
    "intensity": "e.g. 90% effort",
    "notes": "motivation or pacing tip"
  },` : ""}
  "cooldown": {
    "duration": "string (e.g., '5 minutes')",
    "stretches": [
      { "name": "string", "duration": "string" },
      { "name": "string", "duration": "string" }
    ]
  }
}`;

    // ---------- OpenAI API Call ----------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    });

    let raw = completion.choices?.[0]?.message?.content?.trim() || "";
    if (!raw) throw new Error("Empty response from OpenAI.");

    // ---------- JSON Parsing ----------
    raw = raw.replace(/```json|```/g, "").trim();
    let result;

    try {
      result = JSON.parse(raw);
    } catch (e) {
      console.warn("⚠️ Invalid JSON from AI. Returning fallback.");
      return {
        statusCode: 200,
        body: JSON.stringify({
          error: "Invalid JSON from AI",
          raw,
          warmup: {
            description: "Activate full body and joints.",
            duration: "8 minutes",
            rounds: "2 rounds",
            details: ["1 min light cardio", "10 Air Squats", "10 Kettlebell Swings", "Dynamic stretches"]
          },
          metcon: {
            name: "Fallback Metcon",
            format: "AMRAP",
            targetDuration: targetDuration,
            actualDuration: targetDuration,
            description: `AMRAP (${targetDuration} min): 12 Kettlebell Swings @ 24/16kg, 15 Wall Balls, 18/14 cal Bike`,
            movements: [
              { name: "Kettlebell Swings", reps: "12", load: "24/16kg" },
              { name: "Wall Balls", reps: "15", load: "9/6kg" },
              { name: "Assault Bike", reps: "18/14 cal" }
            ],
            scalingOptions: {
              rx: "As written",
              intermediate: "Reduce load by 25%, calories by 20%"
            }
          },
          cooldown: {
            duration: "5 minutes",
            stretches: [
              { name: "Pigeon Pose", duration: "30 sec each side" },
              { name: "Couch Stretch", duration: "30 sec each leg" }
            ]
          }
        }),
      };
    }

    // ---------- Fallbacks ----------
    if (!result.warmup) {
      result.warmup = {
        description: "General activation warm-up.",
        duration: "8 minutes",
        rounds: "2 rounds",
        details: ["1 min row", "10 air squats", "10 push-ups", "10 lunges", "Dynamic stretches"],
      };
    }

    if (!result.cooldown) {
      result.cooldown = {
        duration: "5 minutes",
        stretches: [
          { name: "Pigeon Pose", duration: "30 sec each side" },
          { name: "Couch Stretch", duration: "30 sec each leg" },
        ],
      };
    }

    // ---------- Dauerprüfung ----------
    const actual =
      result.metcon?.actualDuration ||
      result.endurance?.actualDuration ||
      result.hiit?.actualDuration;

    if (actual && Math.abs(actual - targetDuration) > 5) {
      console.warn(`⏱️ Conditioning duration ${actual} min out of target range (${targetDuration} ±5).`);
      result.durationWarning = `Conditioning out of range: ${actual} vs ${targetDuration} (±5min)`;
    }

    // ---------- Rückgabe ----------
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
