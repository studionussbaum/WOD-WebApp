import { Type } from "@google/genai";
import { Workout } from "../types";

// ----------------------------
// 🏋️‍♂️ WOD-Schema (unverändert)
// ----------------------------
const WOD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    wod: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        format: { type: Type.STRING },
        duration: { type: Type.STRING },
        description: { type: Type.STRING },
        scalingOptions: {
          type: Type.OBJECT,
          properties: {
            rx: { type: Type.STRING },
            intermediate: { type: Type.STRING },
          },
          required: ["rx", "intermediate"],
        },
      },
      required: ["name", "format", "duration", "description", "scalingOptions"],
    },
    cooldown: {
      type: Type.OBJECT,
      properties: {
        duration: { type: Type.STRING },
        stretches: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              duration: { type: Type.STRING },
            },
            required: ["name", "duration"],
          },
        },
      },
      required: ["duration", "stretches"],
    },
  },
  required: ["wod", "cooldown"],
};

// ----------------------------
// 🤖 Generate WOD (→ über Netlify-Function)
// ----------------------------
export const generateWod = async (
  goal: string,
  equipment: string[],
  duration: string,
  focus: string[]
) => {
  try {
    const res = await fetch("/.netlify/functions/generateWod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, equipment, duration, focus }),
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error("❌ Error generating WOD:", error);
    throw new Error("Failed to generate workout from AI.");
  }
};

// ----------------------------
// 💡 Training Suggestion (→ ebenfalls über Netlify-Function)
// ----------------------------
export const getTrainingSuggestion = async (workouts: Workout[]) => {
  try {
    const res = await fetch("/.netlify/functions/getTrainingSuggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workouts }),
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error);
    return data.text;
  } catch (error) {
    console.error("❌ Error getting training suggestion:", error);
    return "Could not fetch AI suggestion. Try again later.";
  }
};
