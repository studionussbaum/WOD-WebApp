import React, { useState } from 'react';
import { OneRepMax, COMMON_LIFTS } from '../types';

interface OneRepMaxViewProps {
  oneRepMaxes: OneRepMax[];
  setOneRepMaxes: React.Dispatch<React.SetStateAction<OneRepMax[]>>;
}

const OneRepMaxView: React.FC<OneRepMaxViewProps> = ({ oneRepMaxes, setOneRepMaxes }) => {
    const [editingLift, setEditingLift] = useState<string | null>(null);
    const [weight, setWeight] = useState('');

    const handleUpdate = (lift: string) => {
        const newWeight = parseInt(weight, 10);
        if (isNaN(newWeight) || newWeight <= 0) {
            alert("Please enter a valid weight.");
            return;
        }

        const existingIndex = oneRepMaxes.findIndex(r => r.lift === lift);
        const newRecord: OneRepMax = { lift, weight: newWeight, date: new Date().toISOString() };

        let updatedMaxes;
        if (existingIndex > -1) {
            updatedMaxes = [...oneRepMaxes];
            updatedMaxes[existingIndex] = newRecord;
        } else {
            updatedMaxes = [...oneRepMaxes, newRecord];
        }
        setOneRepMaxes(updatedMaxes);
        setEditingLift(null);
        setWeight('');
    };

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold text-accent mb-6">1-Rep Max Tracker</h1>
            <div className="space-y-3">
                {COMMON_LIFTS.map(lift => {
                    const record = oneRepMaxes.find(r => r.lift === lift);
                    return (
                        <div key={lift} className="bg-secondary p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-lg font-semibold">{lift}</p>
                                    {record ? (
                                        <p className="text-sm text-text-dark">
                                            {record.weight} lbs on {new Date(record.date).toLocaleDateString()}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-text-dark">No record yet</p>
                                    )}
                                </div>
                                <button onClick={() => { setEditingLift(lift); setWeight(record?.weight.toString() || ''); }} className="bg-gray-600 hover:bg-gray-700 text-sm text-white font-bold py-1 px-3 rounded">
                                    {record ? 'Update' : 'Add'}
                                </button>
                            </div>
                            {editingLift === lift && (
                                <div className="mt-4 flex gap-2">
                                    <input
                                        type="number"
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        placeholder="Weight (lbs)"
                                        className="flex-grow bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                                    />
                                    <button onClick={() => handleUpdate(lift)} className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded">Save</button>
                                    <button onClick={() => setEditingLift(null)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Cancel</button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default OneRepMaxView;
