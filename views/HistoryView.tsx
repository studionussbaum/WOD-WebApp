import React, { useState, useMemo } from 'react';
import { Workout } from '../types';
import WorkoutCard from '../components/WorkoutCard';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

interface HistoryViewProps {
  workouts: Workout[];
  deleteWorkout: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ workouts, deleteWorkout }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [searchTerm, setSearchTerm] = useState('');

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const { month, year } = { month: currentDate.getMonth(), year: currentDate.getFullYear() };
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const workoutsByDate = useMemo(() => {
        return workouts.reduce((acc, w) => {
            (acc[w.date] = acc[w.date] || []).push(w);
            return acc;
        }, {} as Record<string, Workout[]>);
    }, [workouts]);

    const filteredWorkouts = useMemo(() => {
        const sorted = [...workouts].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            return sorted.filter(w => {
                const content = w.components.map(c => `${c.details} ${c.score || ''}`).join(' ').toLowerCase();
                return w.title.toLowerCase().includes(lowerCaseSearch) ||
                       content.includes(lowerCaseSearch) ||
                       (w.notes && w.notes.toLowerCase().includes(lowerCaseSearch));
            });
        }
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split('T')[0];
            return workoutsByDate[dateStr] || [];
        }
        return [];
    }, [searchTerm, selectedDate, workouts, workoutsByDate]);

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold text-accent mb-6">Workout History</h1>

            <div className="bg-secondary rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeftIcon /></button>
                    <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long' })} {year}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronRightIcon /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-dark">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 mt-2">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                    {Array.from({ length: daysInMonth }).map((_, day) => {
                        const date = new Date(year, month, day + 1);
                        const dateStr = date.toISOString().split('T')[0];
                        const hasWorkout = !!workoutsByDate[dateStr];
                        const isSelected = selectedDate?.toISOString().split('T')[0] === dateStr;
                        const isToday = getTodayDateString() === dateStr;

                        return (
                            <div key={day} onClick={() => setSelectedDate(date)} className={`relative cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-accent text-white' : isToday ? 'bg-gray-600' : 'hover:bg-gray-700'}`}>
                                {day + 1}
                                {hasWorkout && <div className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-accent'}`}></div>}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="mb-4">
                 <input
                    type="text"
                    placeholder="Search workouts..."
                    value={searchTerm}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        setSelectedDate(null);
                    }}
                    className="w-full bg-secondary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                />
            </div>

            <div className="space-y-4">
                {filteredWorkouts.length > 0 ? (
                    filteredWorkouts.map(w => <WorkoutCard key={w.id} workout={w} onDelete={deleteWorkout} />)
                ) : (
                    <p className="text-text-dark text-center py-4">{searchTerm ? "No workouts match your search." : selectedDate ? "No workouts logged for this day." : "Select a day or search to see workouts."}</p>
                )}
            </div>
        </div>
    );
};

export default HistoryView;
