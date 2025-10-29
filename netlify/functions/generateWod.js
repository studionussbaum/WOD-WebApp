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
You are an experienced CrossFit coach and time-structured programmer.
Your task: create a full workout that fits into a clearly defined total time window.

Create a structured training session that includes:
🔥 Warm-up
${selectedText}
🧘 Cooldown

💬 USER INPUT:
- Goal: ${goal || "General fitness"}
- Equipment available: ${Array.isArray(equipment) && equipment.length ? equipment.join(", ") : "Bodyweight only"}
- Target total duration: ${duration || "45"} minutes (tolerance ±5 minutes)
- Focus areas: ${Array.isArray(focus) && focus.length ? focus.join(", ") : "Full Body"}

🎯 RULES:
- The total duration (sum of all sections) MUST be between ${duration - 5} and ${duration + 5} minutes.
- Estimate section durations realistically:
  • 2–3 s per air squat, push-up or sit-up
  • 3–4 s per burpee
  • 45 s per 200 m run or 10 cal bike
- Adjust reps, rounds, or time caps so the total fits in the target duration window.
- Warm-up must prepare the same muscle groups and movement patterns as used later.
- Use EVERY listed equipment item at least once in warm-up, strength, metcon, endurance, or hiit.
- Include section-specific durations in minutes.
- Always add an overall field "totalDurationEstimate" (in minutes).
- Use RX & intermediate scaling with concrete numbers (kg/reps/cals).
- Output **only valid JSON**, no markdown, comments, or text outside JSON.

⚙️ OUTPUT FORMAT:
{
  "warmup": {
    "description": "Short overview",
    "duration": "string (e.g. '8 minutes')",
    "rounds": "string",
    "details": [
      "Light cardio 1 min",
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
    "duration": "string (e.g. '18 minutes')",
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
    "description": "E.g., 3 rounds of 1 km Row, 400 m Run, 30 Air Squats",
    "duration": "string (e.g., '30 minutes steady work')",
    "intensity": "string (e.g., '70–80% pace')"
  },` : ""}
  ${selectedTypes.includes("hiit") ? `"hiit": {
    "description": "E.g., 8 rounds: 20 s work / 10 s rest – alternating Assault Bike & Burpees",
    "duration": "string (e.g., '16 minutes')",
    "intensity": "string (e.g., '90% effort')",
    "notes": "Short motivational note"
  },` : ""}
  "cooldown": {
    "duration": "string (e.g., '5 minutes')",
    "stretches": [
      { "name": "string", "duration": "string" },
      { "name": "string", "duration": "string" }
    ]
  },
  "totalDurationEstimate": "number (total estimated minutes of full workout)"
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
              load: "Build to heavy 5",
              duration: "12 minutes",
              description: "Focus on bracing and upright torso.",
            },
          }),
          ...(selectedTypes.includes("metcon") && {
            metcon: {
              name: "Fallback Metcon",
              format: "AMRAP",
              duration: duration || "20 minutes",
              description:
                "AMRAP (" +
                (duration || "20 minutes") +
                "): 12 Kettlebell Swings @ 24/16 kg, 15 Wall Balls, 18/14 cal Assault Bike",
              movements: [
                { name: "Kettlebell Swings", reps: "12", load: "24/16 kg", equipment: ["Kettlebell"] },
                { name: "Wall Balls", reps: "15", load: "9/6 kg", equipment: ["Medicine Ball"] },
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
          },
          totalDurationEstimate: duration || 40
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

    // ---------- Dauerprüfung ----------
    const targetDuration = Number(duration);
    const totalEstimate = Number(result.totalDurationEstimate);

    if (totalEstimate && Math.abs(totalEstimate - targetDuration) > 5) {
      console.warn(`⏱️ Workout duration ${totalEstimate} min out of target range (${targetDuration} ± 5).`);
      // 🔁 Optional: automatische Neugenerierung aktivieren
      // const retryPrompt = prompt + "\n⚠️ The previous result exceeded the duration range. Please adjust reps/time to fit.";
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
