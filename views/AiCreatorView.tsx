import React, { useState } from "react";
import { AiWorkout, EQUIPMENT_LIST, FOCUS_AREAS } from "../types";
import { generateWod } from "../services/geminiService";

const AiCreatorView: React.FC = () => {
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("");
  const [equipment, setEquipment] = useState<string[]>(["None"]);
  const [focus, setFocus] = useState<string[]>([]);
  const [generatedWod, setGeneratedWod] = useState<AiWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------
  // 🏋️ Equipment Handler
  // ----------------------------
  const handleEquipmentChange = (item: string) => {
    setEquipment((prev) => {
      if (item === "None") return ["None"];
      const newEquipment = prev.filter((e) => e !== "None");
      if (newEquipment.includes(item)) {
        const filtered = newEquipment.filter((e) => e !== item);
        return filtered.length === 0 ? ["None"] : filtered;
      } else {
        return [...newEquipment, item];
      }
    });
  };

  // ----------------------------
  // 🎯 Focus Handler
  // ----------------------------
  const handleFocusChange = (item: string) => {
    setFocus((prev) =>
      prev.includes(item)
        ? prev.filter((f) => f !== item)
        : [...prev, item]
    );
  };

  // ----------------------------
  // ⚙️ Generate WOD
  // ----------------------------
  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError("Please describe your workout goal.");
      return;
    }
    setIsLoading(true);
    setError("");
    setGeneratedWod(null);

    try {
      const result = await generateWod(goal, equipment, duration, focus);

      if (!result || !result.wod) {
        throw new Error("Invalid WOD response from API.");
      }

      setGeneratedWod(result);
    } catch (err) {
      console.error("Error generating workout:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------
  // 💻 Render Component
  // ----------------------------
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold text-accent">AI WOD Creator</h1>

      {/* FORMULARBEREICH */}
      <div className="bg-secondary p-4 rounded-lg space-y-4">
        {/* GOAL INPUT */}
        <div>
          <label
            htmlFor="wod-goal"
            className="block text-sm font-medium text-text-dark mb-1"
          >
            Describe your workout goal
          </label>
          <textarea
            id="wod-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="e.g., 'Focus on legs and cardio'"
            className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
          />
        </div>

        {/* DURATION INPUT */}
        <div>
          <label
            htmlFor="wod-duration"
            className="block text-sm font-medium text-text-dark mb-1"
          >
            Approximate Workout Duration (optional)
          </label>
          <input
            type="text"
            id="wod-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., '20 minutes'"
            className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
          />
        </div>

        {/* FOCUS AREA */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Focus Area (optional)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {FOCUS_AREAS.map((item) => (
              <button
                key={item}
                onClick={() => handleFocusChange(item)}
                className={`p-2 text-sm rounded-md transition-colors ${
                  focus.includes(item)
                    ? "bg-accent text-white"
                    : "bg-primary hover:bg-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* EQUIPMENT */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Available Equipment
          </label>
          <div className="grid grid-c
