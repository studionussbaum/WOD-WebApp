// netlify/functions/generateWod.js
const OpenAI = require("openai");

exports.handler = async (event) => {
  console.log("📩 generateWod called");

  try {
    const { goal, equipment, duration, focus } = JSON.parse(event.body || "{}");

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in environment." }),
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // ---------- HARTE SPEZIFIKATION ----------
    // Wir erzwingen:
    // 1) vollständige Anweisung in der description ERSTER Satzzeile:
    //    <FORMAT> — <Timecap/Rounds>: <Reps x Movement @ Load/Cal>, ...
    // 2) alle angegebenen Equipment-Teile MÜSSEN vorkommen (oder begründet als „not needed“ markiert sein)
    // 3) scalingOptions.rx / .intermediate haben KLARE Zahlen (Reps/Load/Cal), keine Floskeln
    // 4) zusätzlich eine strukturierte movements-Liste

    const strictPrompt = `
You are an experienced CrossFit coach. Create a complete WOD that strictly follows the user's inputs.

MANDATORY RULES:
- Use EVERY listed equipment item in the workout movements. If something truly doesn't fit, mention it at the end of "description" as "(<item> not needed)".
- The "description" MUST start with a single-line, concrete instruction of the ENTIRE workout, including format and exact scheme.
  Examples:
    "For Time — 4 rounds: 12 Kettlebell Swings @ 24/16kg, 15 Wall Balls (Medicine Ball) @ 9/6kg, 20/15 cal Assault Bike"
    "AMRAP (22 minutes): 200 m Run, 12 Kettlebell Deadlifts @ 32/24kg, 15 Box Jumps (24/20''), 12 Toes-to-Bar"
- "scalingOptions.rx" and "scalingOptions.intermediate" MUST include exact loads (kg) and calories (for machines), not generic wording.
- Also provide a structured "movements" array where each item contains:
  { "name": "...", "reps": "number or pattern", "load": "kg / bodyweight / calories / height", "equipment": ["..."] }

User input:
- Goal: ${goal || "General fitness"}
- Available equipment: ${Array.isArray(equipment) && equipment.length ? equipment.join(", ") : "Bodyweight only"}
- Duration: ${duration || "20 minutes"}
- Focus areas: ${Array.isArray(focus) && focus.length ? focus.join(", ") : "Full Body"}

Return ONLY valid JSON in EXACTLY this format (no markdown, no text before/after):

{
  "wod": {
    "name": "string",
    "format": "AMRAP | For Time | EMOM",
    "duration": "string (e.g., '22 minutes' or '4 rounds for time, cap 22')",
    "description": "ONE first line with the full instruction (format, rounds or timecap, every movement with reps and load/cals). You can add a short second paragraph with tactical tips.",
    "movements": [
      { "name": "string", "reps": "string or number", "load": "string", "equipment": ["string"] }
    ],
    "scalingOptions": {
      "rx": "Concrete RX scheme with exact kg/heights/calories",
      "intermediate": "Concrete scaled scheme with exact kg/heights/calories"
    }
  },
  "cooldown": {
    "duration": "string",
    "stretches": [
      { "name": "string", "duration": "string" },
      { "name": "string", "duration": "string" }
    ]
  }
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4, // präziser
      messages: [{ role: "user", content: strictPrompt }],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    if (!raw) throw new Error("Empty response from OpenAI.");

    // ---------- robustes Parsing ----------
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

    // ---------- Minimalvalidierung & Auto-Verschärfung ----------
    // Sicherstellen, dass description die vollständige Zeile enthält und Bewegungen da sind.
    const wod = result?.wod || {};
    if (!wod.description || !/^(AMRAP|For Time|EMOM)/i.test(wod.description)) {
      // Versuch, aus movements die erste Zeile zu bauen:
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

    // Notfalls movements generieren, wenn leer:
    if (!Array.isArray(wod.movements) || wod.movements.length === 0) {
      // heuristisch aus description nichts Sinnvolles -> minimale Liste aus Equipment
      result.wod.movements = (Array.isArray(equipment) ? equipment : []).map((eq) => ({
        name: eq === "Assault Bike" ? "Assault Bike" : eq,
        reps: eq === "Assault Bike" ? "cal" : "12",
        load: eq === "Assault Bike" ? "Calories (e.g., 18/14)" : "as appropriate",
        equipment: [eq],
      }));
    }

    // scalingOptions absichern
    if (!wod.scalingOptions || !wod.scalingOptions.rx || !wod.scalingOptions.intermediate) {
      result.wod.scalingOptions = {
        rx: "Provide exact numbers for reps, kg, heights, and calories.",
        intermediate: "Reduce loads by ~20–30% and calories by ~20%.",
      };
    }

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
