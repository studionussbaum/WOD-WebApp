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
    const response = await fetch("/.netlify/functions/generateWod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, equipment, duration, focus }),
    });

    if (!response.ok) {
      console.error("❌ Server responded with:", response.status, response.statusText);
      throw new Error(`Server error: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("❌ Failed to parse WOD JSON:", jsonError);
      throw new Error("Invalid JSON response from AI.");
    }

    if (data.error) {
      console.warn("⚠️ AI returned error:", data.error);
      throw new Error(data.error);
    }

    if (!data?.wod || !data?.cooldown) {
      console.warn("⚠️ Missing expected fields in AI response:", data);
      throw new Error("Incomplete workout data from AI.");
    }

    return data;
  } catch (error) {
    console.error("🔥 Error generating WOD:", error);
    return {
      wod: {
        name: "Fallback WOD",
        format: "AMRAP",
        duration: "15 minutes",
        description: "5 rounds: 10 burpees, 20 air squats, 200m run",
        scalingOptions: {
          rx: "As written",
          intermediate: "Reduce reps by 30%",
        },
      },
      cooldown: {
        duration: "5 minutes",
        stretches: [
          { name: "Pigeon pose", duration: "30 sec each side" },
          { name: "Couch stretch", duration: "30 sec each leg" },
        ],
      },
      fallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// ----------------------------
// 💡 Training Suggestion über Netlify Function
// ----------------------------
export const getTrainingSuggestion = async (workouts: Workout[]) => {
  try {
    if (!Array.isArray(workouts) || workouts.length === 0) {
      console.warn("⚠️ No workouts provided to getTrainingSuggestion.");
      return "No recent workouts found. Log a few sessions to get smart AI suggestions!";
    }

    const response = await fetch("/.netlify/functions/trainingSuggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workouts }),
    });

    if (!response.ok) {
      console.error("❌ Server responded with:", response.status, response.statusText);
      return `Could not fetch AI suggestion (Server ${response.status}). Try again later.`;
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("❌ Failed to parse JSON from trainingSuggestion:", jsonError);
      return "AI response error — please try again later.";
    }

    if (data?.suggestion) return data.suggestion.trim();

    if (data?.error) {
      console.warn("⚠️ AI returned error:", data.error);
      return "Could not generate suggestion from AI — check your OpenAI API key or try again later.";
    }

    return "No suggestion available right now. Take a rest day and come back stronger!";
  } catch (error) {
    console.error("🔥 Unexpected error fetching training suggest
