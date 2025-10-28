import React, { useState, useEffect, useMemo } from 'react';
import { Workout, OneRepMax, COMMON_LIFTS } from '../types';
import { getTrainingSuggestion } from '../services/openaiServices';
import WorkoutCard from '../components/WorkoutCard';

interface DashboardProps {
  workouts: Workout[];
  oneRepMaxes: OneRepMax[];
}

const Dashboard: React.FC<DashboardProps> = ({ workouts, oneRepMaxes }) => {
    const [suggestion, setSuggestion] = useState('Loading suggestion...');

    useEffect(() => {
        const fetchSuggestion = async () => {
            const newSuggestion = await getTrainingSuggestion(workouts);
            setSuggestion(newSuggestion);
        };
        fetchSuggestion();
    }, [workouts]);

    const recentWorkouts = useMemo(() =>
        [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3),
    [workouts]);

    const renderSuggestion = (text: string) => {
        const parts = text.split('**');
        return parts.map((part, index) =>
            index % 2 === 1 ? <strong key={index} className="text-accent">{part}</strong> : part
        );
    };

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-3xl font-bold text-accent">Dashboard</h1>
            <div className="bg-secondary p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-2 text-text-light">AI Training Suggestion</h2>
                <p className="text-text-dark whitespace-pre-wrap">{renderSuggestion(suggestion)}</p>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text-light">Recent Workouts</h2>
                {recentWorkouts.length > 0 ? (
                    recentWorkouts.map(w => <WorkoutCard key={w.id} workout={w} />)
                ) : (
                    <p className="text-text-dark">No recent workouts logged. Add one to get started!</p>
                )}
            </div>
             <div className="space-y-4">
                <h2 className="text-xl font-semibold text-text-light">Top Lifts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {COMMON_LIFTS.slice(0, 4).map(lift => {
                    const record = oneRepMaxes.find(r => r.lift === lift);
                    return (
                        <div key={lift} className="bg-secondary p-3 rounded-lg">
                            <p className="font-semibold text-text-light">{lift}</p>
                            {record ? <p className="text-accent text-2xl font-bold">{record.weight} lbs</p> : <p className="text-text-dark">Not set</p>}
                        </div>
                    )
                 })}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
