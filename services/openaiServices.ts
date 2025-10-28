import { Workout } from "../types";

// ----------------------------
// 🧠 Generate WOD über Netlify Function
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
// 💡 Training Suggestion
// ----------------------------
export const getTrainingSuggestion = async (workouts: Workout[]) => {
  try {
    const res = await fetch("/.netlify/functions/trainingSuggestion", {
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
