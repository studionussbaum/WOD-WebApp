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
          <
