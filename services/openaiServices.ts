import { Workout } from "../types";

// ----------------------------
// 🧠 Generate WOD über Netlify Function
// ----------------------------
export const generateWod = async (
  goal: string,
  equipment: string[],
  duration: string,
  focus: string[],
  selectedTypes: string[] // ⬅️ NEU hinzugefügt
) => {
  try {
    const response = await fetch("/.netlify/functions/generateWod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, equipment, duration, focus, selectedTypes }),
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

    // 🟡 FLEXIBLE PRÜFUNG: Akzeptiere strength/metcon/endurance/hiit statt nur wod
    const hasWorkoutSection =
      data?.wod ||
      data?.strength ||
      data?.metcon ||
      data?.endurance ||
      data?.hiit;

    if (!hasWorkoutSection || !data?.cooldown) {
      console.warn("⚠️ Missing expected fields in AI response:", data);
      throw new Error("Incomplete workout data from AI.");
    }

    return data;
  } catch (error) {
    console.error("🔥 Error generating WOD:", error);

    // 🧩 Robuster Fallback für Anzeige im Frontend
    return {
      warmup: {
        description: "General warm-up to activate all major muscle groups.",
        duration: "8 minutes",
        rounds: "2 rounds",
        details: [
          "1 min light cardio (bike or jump rope)",
          "10 Air Squats",
          "10 Push-ups",
          "10 Lunges",
        ],
      },
      strength: {
        focus: "Fallback Strength Block",
        sets: "5x5",
        load: "Moderate weight (~70% 1RM)",
        description: "Use controlled tempo and full range of motion.",
      },
      metcon: {
        name: "Fallback Metcon",
        format: "AMRAP",
        duration: "15 minutes",
        description: "15 min AMRAP: 10 Burpees, 20 Air Squats, 200m Run",
        movements: [
          { name: "Burpees", reps: "10", load: "-", equipment: [] },
          { name: "Air Squats", reps: "20", load: "-", equipment: [] },
          { name: "Run", reps: "200m", load: "-", equipment: [] },
        ],
        scalingOptions: {
          rx: "As described",
          intermediate: "Reduce reps by 25%",
        },
      },
      cooldown: {
        duration: "5 minutes",
        stretches: [
          { name: "Pigeon Pose", duration: "30 sec each side" },
          { name: "Couch Stretch", duration: "30 sec each leg" },
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
    console.error("🔥 Unexpected error fetching training suggestion:", error);
    return "AI suggestion unavailable — please check your connection.";
  }
};
