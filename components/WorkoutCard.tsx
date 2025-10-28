import React from 'react';
import { Workout } from '../types';
import { TrashIcon } from './icons';

interface WorkoutCardProps {
    workout: Workout;
    onDelete?: (id: string) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, onDelete }) => (
    <div className="bg-secondary p-4 rounded-lg shadow-md relative">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm text-accent font-semibold">{workout.type}</p>
                <h3 className="text-lg font-bold text-text-light">{workout.title}</h3>
                <div className="flex items-center gap-2 text-xs text-text-dark">
                    <span>{new Date(workout.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</span>
                    {workout.duration && <span>•</span>}
                    {workout.duration && <span>{workout.duration}</span>}
                </div>
            </div>
            {onDelete && (
                <button onClick={() => onDelete(workout.id)} className="text-text-dark hover:text-red-500 transition-colors p-1">
                    <TrashIcon className="w-5 h-5" />
                </button>
            )}
        </div>
        <div className="mt-3 space-y-3 border-t border-gray-700 pt-3">
            {workout.components.map((comp, index) => (
                <div key={index}>
                    <p className="text-sm font-bold text-text-dark uppercase tracking-wider">{comp.type}</p>
                    <p className="mt-1 text-sm text-text-light whitespace-pre-wrap">{comp.details}</p>
                    {comp.score && <p className="mt-2 text-xs"><strong className="text-text-light">Score:</strong> <span className="text-accent font-semibold">{comp.score}</span></p>}
                </div>
            ))}
        </div>
        {workout.notes && <p className="mt-2 text-sm"><strong className="text-text-light">Notes:</strong> <span className="text-text-dark">{workout.notes}</span></p>}
    </div>
);

export default WorkoutCard;
