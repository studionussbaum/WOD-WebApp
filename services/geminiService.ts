import { GoogleGenAI, Type } from "@google/genai";
import { Workout } from "../types";

// ✅ Browser-/Vite-kompatible Key-Erkennung
const API_KEY =
  import.meta.env.VITE_OPENAI_API_KEY ||
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.warn("⚠️ API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// ----------------------------
// 🏋️‍♂️ WOD-Schema
// ----------------------------
const WOD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    wod: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "A creative name for the workout." },
        format: { type: Type.STRING, description: "The format of the workout (e.g., AMRAP, For Time, EMOM)." },
        duration: { type: Type.STRING, description: "The total duration of the workout, e.g., '8 minutes'." },
        description: { type: Type.STRING, description: "A detailed breakdown of the movements, reps, and rounds. This should be the general structure, with specific weights/targets detailed in the scalingOptions." },
        scalingOptions: {
          type: Type.OBJECT,
          description: "Specific standards for different skill levels.",
          properties: {
            rx: { type: Type.STRING, description: "The 'As Prescribed' (RX) standards. Include specific weights (in lbs), calorie targets for machines, and rep schemes." },
            intermediate: { type: Type.STRING, description: "Standards for an intermediate athlete. This should be a scaled-down version of RX, with lighter weights, lower calorie targets, or modified movements." },
          },
          required: ["rx", "intermediate"],
        },
      },
      required: ["name", "format", "duration", "description", "scalingOptions"],
    },
    cooldown: {
      type: Type.OBJECT,
      properties: {
        duration: { type: Type.STRING, description: "Total duration of the cooldown, e.g., '5 minutes'." },
        stretches: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the stretch." },
              duration: { type: Type.STRING, description: "Recommended duration for the stretch, e.g., '60 seconds per side'." },
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
// 🤖 Generate WOD
// ----------------------------
export const generateWod = async (
  goal: string,
  equipment: string[],
  duration: string,
  focus: string[]
) => {
  const durationInstruction = duration.trim()
    ? `The high-intensity workout (WOD) should be approximately ${duration} long.`
    : "The high-intensity workout (WOD) should be between 6 and 8 minutes long.";

  const focusInstruction =
    focus.length > 0
      ? `The workout should have a primary focus on the following areas: ${focus.join(", ")}.`
      : "";

  const prompt = `
    You are an expert CrossFit and strength & conditioning coach. Your task is to generate a workout plan based on user-provided goals and equipment.

    The response MUST be a valid JSON object matching the provided schema.

    User Goal: ${goal}
    Available Equipment: ${equipment.join(", ")}
    ${focusInstruction}

    Generate a workout plan with two parts:
    1. ${durationInstruction}
    2. A 5-minute cool-down routine with specific stretches and durations.

    The workout should be challenging. The workout's 'description' should outline the general structure.
    Crucially, under 'scalingOptions', you MUST provide specific, distinct standards for two levels:
    - **RX (As Prescribed):** The target for advanced athletes. This must include specific weights (in lbs), calorie targets (for machines like rowers/bikes), and any specific movement standards.
    - **Intermediate:** A scaled version for developing athletes. This must include lighter weights, lower calorie targets, or modified movements/reps.

    Ensure the generated weights, reps, and targets are appropriate for the specified movements and skill levels.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: WOD_SCHEMA,
      },
    });

    const text = response.text.trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating WOD:", error);
    throw new Error("Failed to generate workout from AI.");
  }
};

// ----------------------------
// 💡 Training Suggestion
// ----------------------------
export const getTrainingSuggestion = async (workouts: Workout[]) => {
  if (workouts.length === 0) {
    return "Welcome! Log your first workout to start getting personalized suggestions.";
  }

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const recentWorkouts = workouts.filter((w) => new Date(w.date) >= sevenDaysAgo);

  if (recentWorkouts.length === 0) {
    return "It's been a while! Time to get back in there. How about a quick Metcon to get started?";
  }

  const workoutHistory = recentWorkouts
    .map((w) => `Date: ${w.date}, Type: ${w.type}, Title: ${w.title}`)
    .join("\n");

  const prompt = `
    You are an AI fitness advisor. Your role is to analyze a user's recent workout history and provide a recommendation for their next session.

    Here is the user's workout log for the past 7 days:
    ${workoutHistory}

    Based on this history, provide a concise suggestion for today. The suggestion should be one of three types: 'Rest', 'Strength', or 'Endurance/Metcon'.

    Consider factors like:
    - Number of consecutive training days.
    - Recent workout intensity and type (Metcon, Strength, Endurance).
    - Lack of a certain type of training recently.

    Your response should be a single, encouraging paragraph. Start with your recommendation in bold (e.g., **"Recommendation: Strength Training"**). Do not use markdown for the bolding, use ** and **.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting training suggestion:", error);
    return "Could not fetch AI suggestion. Check your workout log and try again.";
  }
};
