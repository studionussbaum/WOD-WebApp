import React, { useState } from "react";
import { AiWorkout, EQUIPMENT_LIST, FOCUS_AREAS } from "../types";
import { generateWod } from "../services/openaiServices";

const AiCreatorView: React.FC = () => {
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("");
  const [equipment, setEquipment] = useState<string[]>(["None"]);
  const [focus, setFocus] = useState<string[]>([]);
  const [generatedWod, setGeneratedWod] = useState<AiWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 🟩 Log-Formular
  const [showLogForm, setShowLogForm] = useState(false);
  const [logData, setLogData] = useState({
    date: new Date().toISOString().split("T")[0],
    result: "",
    notes: "",
  });
  const [isLogging, setIsLogging] = useState(false);

  // 🟩 Auswahl der Trainingsarten
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["strength", "metcon"]);
  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

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

  const handleFocusChange = (item: string) => {
    setFocus((prev) => (prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item]));
  };

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError("Please describe your workout goal.");
      return;
    }
    setIsLoading(true);
    setError("");
    setGeneratedWod(null);

    try {
      const numericDuration = Number(duration.replace(/\D/g, "")) || 20;
      const result = await generateWod(goal, equipment, numericDuration, focus, selectedTypes);

      const hasWorkoutSection =
        result?.wod || result?.strength || result?.metcon || result?.endurance || result?.hiit;

      if (!result || !hasWorkoutSection) {
        console.warn("⚠️ Missing expected workout fields:", result);
        throw new Error("Incomplete or invalid workout data from API");
      }

      setGeneratedWod(result);
    } catch (err) {
      console.error("Error generating workout:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🟢 Workout in DB loggen
  const handleLogSubmit = async () => {
    if (!generatedWod) return;
    setIsLogging(true);
    try {
      const response = await fetch("/.netlify/functions/logWod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wod: generatedWod,
          userId: "demo-user-001", // später dynamisch
          result: logData.result,
          notes: logData.notes,
          date: logData.date,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ Workout successfully logged!");
        setShowLogForm(false);
        setLogData({
          date: new Date().toISOString().split("T")[0],
          result: "",
          notes: "",
        });
      } else {
        alert("⚠️ Could not log workout: " + data.error);
      }
    } catch (error) {
      console.error("🔥 Error logging workout:", error);
      alert("An error occurred while logging the workout.");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold text-accent">AI WOD Creator</h1>

      {/* --- Input Section --- */}
      <div className="bg-secondary p-4 rounded-lg space-y-4">
        {/* Zielbeschreibung */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-1">
            Describe your workout goal
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="e.g., 'Focus on legs and cardio'"
            className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
          />
        </div>

        {/* Dauer */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-1">
            Approximate Workout Duration (optional)
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., '20 minutes'"
            className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
          />
        </div>

        {/* Fokus */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">Focus Area (optional)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {FOCUS_AREAS.map((item) => (
              <button
                key={item}
                onClick={() => handleFocusChange(item)}
                className={`p-2 text-sm rounded-md transition-colors ${
                  focus.includes(item) ? "bg-accent text-white" : "bg-primary hover:bg-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">Available Equipment</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {EQUIPMENT_LIST.map((item) => (
              <button
                key={item}
                onClick={() => handleEquipmentChange(item)}
                className={`p-2 text-sm rounded-md transition-colors ${
                  equipment.includes(item) ? "bg-accent text-white" : "bg-primary hover:bg-gray-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Workout Type */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">Workout Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "strength", label: "Strength" },
              { id: "metcon", label: "Metcon" },
              { id: "endurance", label: "Endurance" },
              { id: "hiit", label: "HIIT" },
            ].map((type) => (
              <label
                key={type.id}
                className="flex items-center space-x-2 bg-primary p-2 rounded cursor-pointer hover:bg-accent/20"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type.id)}
                  onChange={() => toggleType(type.id)}
                  className="accent-accent"
                />
                <span className="text-text-light text-sm">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* --- Generate Button --- */}
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center disabled:bg-gray-500"
        >
          {isLoading ? "Generating..." : "Generate Workout"}
        </button>
      </div>

      {/* --- Error Handling --- */}
      {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg">{error}</div>}

      {/* --- Workout Result --- */}
      {generatedWod && (
        <div className="space-y-6 animate-fade-in">
          {/* WARMUP */}
          {generatedWod.warmup && (
            <div className="bg-secondary p-4 rounded-lg">
              <h3 className="text-xl font-bold text-accent">
                Warm-up ({generatedWod.warmup.duration || "—"})
              </h3>
              <p className="text-text-dark mt-1">{generatedWod.warmup.description}</p>
              {generatedWod.warmup.details && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-text-light">
                  {generatedWod.warmup.details.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* MAIN WORKOUT (Metcon / etc.) */}
          {generatedWod.metcon && (
            <div className="bg-secondary p-4 rounded-lg">
              <h2 className="text-2xl font-bold text-accent">{generatedWod.metcon.name}</h2>
              <p className="text-sm text-text-dark font-semibold">
                {generatedWod.metcon.format} — Target: {generatedWod.metcon.targetDuration} min ·
                Actual: {generatedWod.metcon.actualDuration || "?"} min
              </p>
              <p className="mt-2 whitespace-pre-wrap">{generatedWod.metcon.description}</p>

              {generatedWod.durationWarning && (
                <div className="mt-3 text-yellow-400 bg-yellow-900/20 border border-yellow-700 p-3 rounded-lg">
                  ⚠️ {generatedWod.durationWarning}
                </div>
              )}
            </div>
          )}

          {/* COOL DOWN */}
          {generatedWod.cooldown && (
            <div className="bg-secondary p-4 rounded-lg">
              <h3 className="text-xl font-bold text-text-light">
                Cool Down ({generatedWod.cooldown.duration})
              </h3>
              <ul className="mt-2 list-disc list-inside space-y-1 text-text-dark">
                {generatedWod.cooldown.stretches?.map((stretch, idx) => (
                  <li key={idx}>
                    {stretch.name}: <span className="text-text-light">{stretch.duration}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* --- Log Workout Button --- */}
          {!showLogForm && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowLogForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Log this Workout
              </button>
            </div>
          )}

          {/* --- Log Workout Modal --- */}
          {showLogForm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-secondary p-6 rounded-lg w-[90%] max-w-md shadow-lg space-y-3">
                <h3 className="text-xl font-bold text-accent mb-2">Log your result</h3>

                <label className="block text-sm text-text-light mb-1">Date</label>
                <input
                  type="date"
                  value={logData.date}
                  onChange={(e) => setLogData({ ...logData, date: e.target.value })}
                  className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light"
                />

                <label className="block text-sm text-text-light mb-1">Result</label>
                <input
                  type="text"
                  placeholder="e.g. 5 rounds + 12 reps or 14:45"
                  value={logData.result}
                  onChange={(e) => setLogData({ ...logData, result: e.target.value })}
                  className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light"
                />

                <label className="block text-sm text-text-light mb-1">Notes</label>
                <textarea
                  rows={3}
                  placeholder="How did it feel?"
                  value={logData.notes}
                  onChange={(e) => setLogData({ ...logData, notes: e.target.value })}
                  className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light"
                />

                <div className="flex justify-between mt-4">
                  <button
                    onClick={handleLogSubmit}
                    disabled={isLogging}
                    className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-600"
                  >
                    {isLogging ? "Saving..." : "Save Log"}
                  </button>
                  <button
                    onClick={() => setShowLogForm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiCreatorView;
