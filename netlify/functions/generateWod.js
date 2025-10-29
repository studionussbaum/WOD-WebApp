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

    // 🧠 Dynamischer Abschnittsaufbau basierend auf der Auswahl
    const chosenSections = [];
    if (selectedTypes.includes("strength")) chosenSections.push("1️⃣ Strength Part (Skill/Strength Work)");
    if (selectedTypes.includes("metcon")) chosenSections.push("2️⃣ Metcon (Conditioning)");
    if (selectedTypes.includes("endurance")) chosenSections.push("3️⃣ Endurance Session");
    if (selectedTypes.includes("hiit")) chosenSections.push("4️⃣ HIIT Session");

    const selectedText = chosenSections.length
      ? chosenSections.join("\n")
      : "1️⃣ Main WOD (Workout of the Day)";

    // ---------- DYNAMISCHER PROMPT ----------
    const prompt = `
You are an experienced CrossFit coach and workout designer.
Create a structured training session that includes:
🔥 Warm-up
${selectedText}
🧘 Cooldown

💬 USER INPUT:
- Goal: ${goal || "General fitness"}
- Equipment available: ${Array.isArray(equipment) && equipment.length ? equipment.join(", ") : "Bodyweight only"}
- Target duration for conditioning section (MetCon/Endurance/HIIT only): ${duration || "20"} minutes (tolerance ±5 minutes)
- Focus areas: ${Array.isArray(focus) && focus.length ? focus.join(", ") : "Full Body"}

🎯 RULES:
- Only the *conditioning section* (MetCon, Endurance or HIIT) must last between ${duration - 5} and ${duration + 5} minutes.
- Warm-up, Strength and Cooldown are excluded from this duration rule.
- Estimate conditioning duration realistically:
  • 2–3 s per bodyweight rep
  • 3–4 s per burpee
  • 45 s per 200 m run or 10 cal bike
- Adjust reps, rounds or time caps so the conditioning fits the time window.
- Add "targetDuration" (user goal) and "actualDuration" (estimated by coach).
- Warm-up must prepare similar movement patterns.
- Strength is independent and time-exempt.
- Provide RX & Intermediate scaling with exact numbers (kg/reps/cals).
- Output **only valid JSON**, no markdown or commentary.

⚙️ OUTPUT FORMAT:
{
  "warmup": {
    "description": "Short overview",
    "duration": "string (e.g. '8 minutes')",
    "rounds": "string",
    "details": [
      "Light ${equipment.includes("Assault Bike") ? "Assault Bike" : "Cardio"} 1 min",
      "10 ${equipment.includes("Kettlebell") ? "Kettlebell Swings" : "Air Squats"}",
      "Dynamic stretches for ${focus.join(", ")}"
    ]
  },
  ${selectedTypes.includes("strength") ? `"strength": {
    "focus": "string (e.g. Front Squat)",
    "sets": "e.g. 5x5",
    "load": "kg or % of 1RM",
    "duration": "string (e.g. '12 minutes')",
    "description": "Short tip or progression"
  },` : ""}
  ${selectedTypes.includes("metcon") ? `"metcon": {
    "name": "Workout Title",
    "format": "AMRAP | For Time | EMOM",
    "targetDuration": ${duration},
    "actualDuration": "number (estimated minutes)",
    "description": "Full single-line instruction with reps, rounds, and loads",
    "movements": [
      { "name": "string", "reps": "number or pattern", "load": "kg/cal", "equipment": ["string"] }
    ],
    "scalingOptions": {
      "rx": "Concrete RX scheme",
      "intermediate": "Scaled variant"
    }
  },` : ""}
  ${selectedTypes.includes("endurance") ? `"endurance": {
    "description": "E.g., 3 rounds of 1 km Row, 400m Run, 30 Air Squats",
    "targetDuration": ${duration},
    "actualDuration": "number (estimated minutes)",
    "intensity": "string (e.g., '70–80% pace')"
  },` : ""}
  ${selectedTypes.includes("hiit") ? `"hiit": {
    "description": "E.g., 8 rounds: 20s work / 10s rest - alternating Assault Bike and Burpees",
    "targetDuration": ${duration},
    "actualDuration": "number (estimated minutes)",
    "intensity": "string (e.g., '90% effort')",
    "notes": "Short motivational note"
  },` : ""}
  "cooldown": {
    "duration": "string (e.g., '5 minutes')",
    "stretches": [
      { "name": "string", "duration": "string" },
      { "name": "string", "duration": "string" }
    ]
  }
}`;

    // ---------- OpenAI-Aufruf ----------
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
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
            description: "Activate full body and joints.",
            duration: "8 minutes",
            rounds: "2 rounds",
            details: [
              "1 min light cardio",
              "10 Air Squats",
              "10 Kettlebell Swings",
              "Dynamic stretches"
            ]
          },
          ...(selectedTypes.includes("strength") && {
            strength: {
              focus: "Front Squat",
              sets: "5x5",
              load: "Build to heavy set of 5",
              description: "Focus on bracing and upright torso.",
            },
          }),
          ...(selectedTypes.includes("metcon") && {
            metcon: {
              name: "Fallback Metcon",
              format: "AMRAP",
              targetDuration: duration || 20,
              actualDuration: duration || 20,
              description:
                "AMRAP (" +
                (duration || "20 minutes") +
                "): 12 Kettlebell Swings @ 24/16kg, 15 Wall Balls, 18/14 cal Assault Bike",
              movements: [
                { name: "Kettlebell Swings", reps: "12", load: "24/16kg", equipment: ["Kettlebell"] },
                { name: "Wall Balls", reps: "15", load: "9/6kg", equipment: ["Medicine Ball"] },
                { name: "Assault Bike", reps: "cal", load: "18/14 cal", equipment: ["Assault Bike"] }
              ],
              scalingOptions: {
                rx: "As above",
                intermediate: "Reduce load by 25%, calories by 20%",
              },
            },
          }),
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

    // ---------- Validierungen / Fallbacks ----------
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

    if (!result.cooldown) {
      result.cooldown = {
        duration: "5 minutes",
        stretches: [
          { name: "Pigeon Pose", duration: "30 sec each side" },
          { name: "Couch Stretch", duration: "30 sec each leg" },
        ],
      };
    }

    // ---------- Dauerprüfung NUR für Conditioning ----------
    const targetDuration = Number(duration);
    const actual =
      result.metcon?.actualDuration ||
      result.endurance?.actualDuration ||
      result.hiit?.actualDuration;

    if (actual && Math.abs(actual - targetDuration) > 5) {
      console.warn(`⏱️ Conditioning duration ${actual} min out of target range (${targetDuration} ±5).`);
      // Optional: automatische Neugenerierung aktivieren
      // const retryPrompt = prompt + "\n⚠️ Adjust reps/time to fit the conditioning time window.";
      // const retry = await openai.chat.completions.create({
      //   model: "gpt-4o-mini",
      //   temperature: 0.4,
      //   messages: [{ role: "user", content: retryPrompt }],
      // });
      // result = JSON.parse(retry.choices?.[0]?.message?.content?.trim() || "{}");
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
