import React, { useState } from 'react';
import { AiWorkout, EQUIPMENT_LIST, FOCUS_AREAS } from '../types';
import { generateWod } from '../services/geminiService'; // Deine Service-Funktion

const AiCreatorView: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('');
  const [equipment, setEquipment] = useState<string[]>(['None']);
  const [focus, setFocus] = useState<string[]>([]);
  const [generatedWod, setGeneratedWod] = useState<AiWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEquipmentChange = (item: string) => {
    setEquipment(prev => {
      if (item === 'None') return ['None'];
      const newEquipment = prev.filter(e => e !== 'None');
      if (newEquipment.includes(item)) {
        const filtered = newEquipment.filter(e => e !== item);
        return filtered.length === 0 ? ['None'] : filtered;
      } else {
        return [...newEquipment, item];
      }
    });
  };

  const handleFocusChange = (item: string) => {
    setFocus(prev => (prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]));
  };

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError("Please describe your workout goal.");
      return;
    }
    setIsLoading(true);
    setError('');
    setGeneratedWod(null);

    try {
      const result = await generateWod(goal, equipment, duration, focus);

      // --- Sicherstellen, dass WOD korrekt ist ---
      if (!result || !result.wod) {
        throw new Error("Invalid WOD data from API");
      }

      setGeneratedWod(result);
    } catch (err) {
      console.error("Error generating workout:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold text-accent">AI WOD Creator</h1>

      {/* --- Input Section --- */}
      <div className="bg-secondary p-4 rounded-lg space-y-4">
        <div>
          <label htmlFor="wod-goal" className="block text-sm font-medium text-text-dark mb-1">
            Describe your workout goal
          </label>
          <textarea
            id="wod-goal"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            rows={3}
            placeholder="e.g., 'Focus on legs and cardio'"
            className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
          />
        </div>

        <div>
          <label htmlFor="wod-duration" className="block text-sm font-medium text-text-dark mb-1">
            Approximate Workout Duration (optional)
          </label>
          <input
            type="text"
            id="wod-duration"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            placeholder="e.g., '20 minutes'"
            className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
          />
        </div>

        {/* --- Focus Areas --- */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">Focus Area (optional)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {FOCUS_AREAS.map(item => (
              <button
                key={item}
                onClick={() => handleFocusChange(item)}
                className={`p-2 text-sm rounded-md transition-colors ${
                  focus.includes(item) ? 'bg-accent text-white' : 'bg-primary hover:bg-gray-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* --- Equipment --- */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">Available Equipment</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {EQUIPMENT_LIST.map(item => (
              <button
                key={item}
                onClick={() => handleEquipmentChange(item)}
                className={`p-2 text-sm rounded-md transition-colors ${
                  equipment.includes(item) ? 'bg-accent text-white' : 'bg-primary hover:bg-gray-700'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

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
      {generatedWod && generatedWod.wod && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-secondary p-4 rounded-lg">
            <h2 className="text-2xl font-bold text-accent">{generatedWod.wod.name}</h2>
            <p className="text-sm text-text-dark font-semibold">
              {generatedWod.wod.format} ({generatedWod.wod.duration})
            </p>
            <p className="mt-2 whitespace-pre-wrap">{generatedWod.wod.description}</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
              <div>
                <h4 className="font-bold text-lg text-text-light">RX</h4>
                <p className="text-text-dark whitespace-pre-wrap">
                  {generatedWod.wod.scalingOptions?.rx || "—"}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-lg text-text-light">Intermediate</h4>
                <p className="text-text-dark whitespace-pre-wrap">
                  {generatedWod.wod.scalingOptions?.intermediate || "—"}
                </p>
              </div>
            </div>
          </div>

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
        </div>
      )}
    </div>
  );
};

export default AiCreatorView;
