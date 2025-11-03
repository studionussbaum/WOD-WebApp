import React, { useState } from "react";
import {
  Workout,
  WorkoutType,
  ViewType,
  WorkoutComponent,
  WORKOUT_COMPONENT_TYPES,
  WorkoutComponentType,
} from "../types";
import { PlusCircleIcon, TrashIcon } from "../components/icons";

const getTodayDateString = () => new Date().toISOString().split("T")[0];

interface LogWorkoutViewProps {
  addWorkout: (workout: Omit<Workout, "id">) => void;
  setView: (view: ViewType) => void;
}

const LogWorkoutView: React.FC<LogWorkoutViewProps> = ({ addWorkout, setView }) => {
  const [formData, setFormData] = useState({
    date: getTodayDateString(),
    title: "",
    type: "Metcon" as WorkoutType,
    duration: "",
    components: [{ type: "Metcon", details: "", score: "" }] as WorkoutComponent[],
    notes: "",
  });

  // 🧭 Input-Handler
  const handleDataChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleComponentChange = (index: number, field: "type" | "details" | "score", value: string) => {
    const newComponents = [...formData.components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setFormData((prev) => ({ ...prev, components: newComponents }));
  };

  const addComponent = () => {
    setFormData((prev) => ({
      ...prev,
      components: [...prev.components, { type: "Accessory", details: "", score: "" }],
    }));
  };

  const removeComponent = (index: number) => {
    if (formData.components.length <= 1) return;
    const newComponents = formData.components.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, components: newComponents }));
  };

  // 🟩 Supabase Logging-Funktion
  const handleSupabaseLog = async () => {
    try {
      const payload = {
        wod: {
          goal: "Manual Entry",
          [formData.type.toLowerCase()]: {
            name: formData.title,
            description: formData.components.map(
              (c) => `${c.type}: ${c.details}`
            ).join("\n"),
          },
          focus: [formData.type],
          equipment: [],
        },
        userId: "demo-user-001",
        result: formData.components.map((c) => c.score || "").join(", "),
        notes: formData.notes,
        date: formData.date,
      };

      console.log("🚀 Sending manual log payload:", payload);

      const response = await fetch("/.netlify/functions/logWod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("📡 Response:", data);

      if (data.success) {
        alert("✅ Workout successfully logged to Supabase!");
      } else {
        alert("❌ Log failed: " + (data.error || "Unknown error"));
        console.error("Supabase error:", data);
      }
    } catch (err) {
      console.error("🔥 Network or parsing error:", err);
      alert("⚠️ Could not send to Supabase.");
    }
  };

  // 🔘 Submit-Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.components.some((c) => !c.details)) {
      alert("Please fill in a title and details for all workout components.");
      return;
    }

    await handleSupabaseLog(); // sendet an Netlify Function
    addWorkout(formData);      // optional: zusätzlich lokal speichern
    setView("history");        // wechselt zur History-Ansicht
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold text-accent mb-6">Log New Workout</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-secondary p-4 rounded-lg space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-text-dark">
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleDataChange}
              className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-text-dark">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleDataChange}
              placeholder="e.g., Murph Prep, Heavy Deadlifts"
              className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-text-dark">
              Approx. Duration
            </label>
            <input
              type="text"
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleDataChange}
              placeholder="e.g., 60 mins"
              className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-text-dark">
              Main Focus
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleDataChange}
              className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
            >
              <option>Metcon</option>
              <option>Strength</option>
              <option>Endurance</option>
              <option>Accessory</option>
              <option>Rest Day</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-light">Workout Components</h2>
          {formData.components.map((component, index) => (
            <div key={index} className="bg-secondary p-4 rounded-lg space-y-3 relative">
              {formData.components.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeComponent(index)}
                  className="absolute top-2 right-2 text-text-dark hover:text-red-500 p-1"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
              <div>
                <label
                  htmlFor={`component-type-${index}`}
                  className="block text-sm font-medium text-text-dark"
                >
                  Component Type
                </label>
                <select
                  id={`component-type-${index}`}
                  value={component.type}
                  onChange={(e) =>
                    handleComponentChange(index, "type", e.target.value as WorkoutComponentType)
                  }
                  className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                >
                  {WORKOUT_COMPONENT_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`component-details-${index}`}
                  className="block text-sm font-medium text-text-dark"
                >
                  Details
                </label>
                <textarea
                  id={`component-details-${index}`}
                  value={component.details}
                  onChange={(e) => handleComponentChange(index, "details", e.target.value)}
                  rows={4}
                  placeholder={`e.g., 5 Rounds For Time:\n400m Run\n21 Kettlebell Swings (53/35)`}
                  className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label
                  htmlFor={`component-score-${index}`}
                  className="block text-sm font-medium text-text-dark"
                >
                  Component Score (Optional)
                </label>
                <input
                  type="text"
                  id={`component-score-${index}`}
                  value={component.score || ""}
                  onChange={(e) => handleComponentChange(index, "score", e.target.value)}
                  placeholder="e.g., 225 lbs, 15:32"
                  className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                />
              </div>
            </div>
