import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { generateWod, getTrainingSuggestion } from './services/geminiService';
import { Workout, WorkoutType, OneRepMax, ViewType, COMMON_LIFTS, EQUIPMENT_LIST, AiWorkout, User, USERS, AllUsersData, WorkoutComponent, WORKOUT_COMPONENT_TYPES, WorkoutComponentType } from './types';
import { HomeIcon, PlusCircleIcon, CalendarIcon, DumbbellIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, UserIcon } from './components/icons';

// --- UTILITY FUNCTIONS ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// --- SUB-COMPONENTS ---

interface HeaderProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
}
const Header: React.FC<HeaderProps> = ({ currentUser, setCurrentUser }) => (
  <header className="bg-secondary p-3 flex justify-center items-center gap-2 shadow-md sticky top-0 z-10">
    <UserIcon className="w-6 h-6 text-text-dark" />
    <div className="flex rounded-lg bg-primary p-1">
      {USERS.map(user => (
        <button
          key={user}
          onClick={() => setCurrentUser(user)}
          className={`px-4 py-1 text-sm font-semibold transition-colors rounded-md ${
            currentUser === user
              ? 'bg-accent text-white shadow'
              : 'text-text-dark hover:bg-gray-700'
          }`}
        >
          {user}
        </button>
      ))}
    </div>
  </header>
);

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
    
    // This function is a bit complex due to React not parsing innerHTML for security.
    // It safely splits the string by the bold markers and renders React elements.
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


interface LogWorkoutViewProps {
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  setView: (view: ViewType) => void;
}
const LogWorkoutView: React.FC<LogWorkoutViewProps> = ({ addWorkout, setView }) => {
    const [formData, setFormData] = useState({
        date: getTodayDateString(),
        title: '',
        type: 'Metcon' as WorkoutType,
        duration: '',
        components: [{ type: 'Metcon', details: '', score: '' }] as WorkoutComponent[],
        notes: ''
    });

    const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleComponentChange = (index: number, field: 'type' | 'details' | 'score', value: string) => {
        const newComponents = [...formData.components];
        newComponents[index] = { ...newComponents[index], [field]: value };
        setFormData(prev => ({ ...prev, components: newComponents }));
    };

    const addComponent = () => {
        setFormData(prev => ({
            ...prev,
            components: [...prev.components, { type: 'Accessory', details: '', score: '' }]
        }));
    };
    
    const removeComponent = (index: number) => {
        if (formData.components.length <= 1) return; // Don't remove the last one
        const newComponents = formData.components.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, components: newComponents }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || formData.components.some(c => !c.details)) {
            alert("Please fill in a title and details for all workout components.");
            return;
        }
        addWorkout(formData);
        setView('history');
    };

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold text-accent mb-6">Log New Workout</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Main Details */}
                <div className="bg-secondary p-4 rounded-lg space-y-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-text-dark">Date</label>
                        <input type="date" id="date" name="date" value={formData.date} onChange={handleDataChange} className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"/>
                    </div>
                     <div>
                        <label htmlFor="title" className="block text-sm font-medium text-text-dark">Title</label>
                        <input type="text" id="title" name="title" value={formData.title} onChange={handleDataChange} placeholder="e.g., Murph Prep, Heavy Deadlifts" className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"/>
                    </div>
                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-text-dark">Approx. Duration</label>
                        <input type="text" id="duration" name="duration" value={formData.duration} onChange={handleDataChange} placeholder="e.g., 60 mins" className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"/>
                    </div>
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-text-dark">Main Focus</label>
                        <select id="type" name="type" value={formData.type} onChange={handleDataChange} className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent">
                            <option>Metcon</option>
                            <option>Strength</option>
                            <option>Endurance</option>
                            <option>Accessory</option>
                            <option>Rest Day</option>
                        </select>
                    </div>
                </div>

                {/* Dynamic Components */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-text-light">Workout Components</h2>
                    {formData.components.map((component, index) => (
                        <div key={index} className="bg-secondary p-4 rounded-lg space-y-3 relative">
                            {formData.components.length > 1 && (
                                <button type="button" onClick={() => removeComponent(index)} className="absolute top-2 right-2 text-text-dark hover:text-red-500 p-1">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                            <div>
                                <label htmlFor={`component-type-${index}`} className="block text-sm font-medium text-text-dark">Component Type</label>
                                <select 
                                    id={`component-type-${index}`} 
                                    value={component.type} 
                                    onChange={(e) => handleComponentChange(index, 'type', e.target.value as WorkoutComponentType)}
                                    className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                                >
                                    {WORKOUT_COMPONENT_TYPES.map(type => <option key={type}>{type}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor={`component-details-${index}`} className="block text-sm font-medium text-text-dark">Details</label>
                                <textarea 
                                    id={`component-details-${index}`} 
                                    value={component.details} 
                                    onChange={(e) => handleComponentChange(index, 'details', e.target.value)}
                                    rows={4} 
                                    placeholder={`e.g., 5 Rounds For Time:\n400m Run\n21 Kettlebell Swings (53/35)`}
                                    className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                                />
                            </div>
                            <div>
                                <label htmlFor={`component-score-${index}`} className="block text-sm font-medium text-text-dark">Component Score (Optional)</label>
                                <input
                                    type="text"
                                    id={`component-score-${index}`}
                                    value={component.score || ''}
                                    onChange={(e) => handleComponentChange(index, 'score', e.target.value)}
                                    placeholder="e.g., 225 lbs, 15:32"
                                    className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                                />
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addComponent} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                        <PlusCircleIcon className="w-5 h-5"/>
                        Add Component
                    </button>
                </div>
                
                {/* Notes */}
                 <div className="bg-secondary p-4 rounded-lg space-y-4">
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-text-dark">Notes</label>
                        <textarea id="notes" name="notes" value={formData.notes} onChange={handleDataChange} rows={2} placeholder="e.g., Felt strong on the runs, broke up the pull-ups..." className="mt-1 block w-full bg-primary border border-gray-600 rounded-md shadow-sm py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"/>
                    </div>
                </div>

                <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-lg transition-colors">Log Workout</button>
            </form>
        </div>
    );
};

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
            
            {/* Calendar */}
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

            {/* Search and Display */}
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

interface AiCreatorViewProps {}
const AiCreatorView: React.FC<AiCreatorViewProps> = () => {
    const [goal, setGoal] = useState('');
    const [duration, setDuration] = useState('');
    const [equipment, setEquipment] = useState<string[]>(['None']);
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

    const handleGenerate = async () => {
        if (!goal.trim()) {
            setError("Please describe your workout goal.");
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedWod(null);
        try {
            const result = await generateWod(goal, equipment, duration);
            setGeneratedWod(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="p-4 space-y-6">
            <h1 className="text-3xl font-bold text-accent">AI WOD Creator</h1>
            <div className="bg-secondary p-4 rounded-lg space-y-4">
                <div>
                    <label htmlFor="wod-goal" className="block text-sm font-medium text-text-dark mb-1">Describe your workout goal</label>
                    <textarea
                        id="wod-goal"
                        value={goal}
                        onChange={e => setGoal(e.target.value)}
                        rows={3}
                        placeholder="e.g., 'Focus on legs and cardio', 'A quick upper body pump', 'Something with gymnastics skills'"
                        className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                    />
                </div>
                <div>
                    <label htmlFor="wod-duration" className="block text-sm font-medium text-text-dark mb-1">Approximate Workout Duration (optional)</label>
                    <input
                        type="text"
                        id="wod-duration"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        placeholder="e.g., '20 minutes', 'around 15 mins'"
                        className="w-full bg-primary border border-gray-600 rounded-md py-2 px-3 text-text-light focus:outline-none focus:ring-accent focus:border-accent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">Available Equipment</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {EQUIPMENT_LIST.map(item => (
                            <button key={item} onClick={() => handleEquipmentChange(item)} className={`p-2 text-sm rounded-md transition-colors ${equipment.includes(item) ? 'bg-accent text-white' : 'bg-primary hover:bg-gray-700'}`}>
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
                 <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center disabled:bg-gray-500">
                    {isLoading ? (
                        <>
                         <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                        </>
                    ) : "Generate Workout"}
                </button>
            </div>
            
            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg">{error}</div>}

            {generatedWod && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-secondary p-4 rounded-lg">
                        <h2 className="text-2xl font-bold text-accent">{generatedWod.wod.name}</h2>
                        <p className="text-sm text-text-dark font-semibold">{generatedWod.wod.format} ({generatedWod.wod.duration})</p>
                        <p className="mt-2 whitespace-pre-wrap">{generatedWod.wod.description}</p>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                            <div>
                                <h4 className="font-bold text-lg text-text-light">RX</h4>
                                <p className="text-text-dark whitespace-pre-wrap">{generatedWod.wod.scalingOptions.rx}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-text-light">Intermediate</h4>
                                <p className="text-text-dark whitespace-pre-wrap">{generatedWod.wod.scalingOptions.intermediate}</p>
                            </div>
                        </div>
                    </div>
                     <div className="bg-secondary p-4 rounded-lg">
                        <h3 className="text-xl font-bold text-text-light">Cool Down ({generatedWod.cooldown.duration})</h3>
                        <ul className="mt-2 list-disc list-inside space-y-1 text-text-dark">
                            {generatedWod.cooldown.stretches.map(stretch => (
                                <li key={stretch.name}>{stretch.name}: <span className="text-text-light">{stretch.duration}</span></li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useLocalStorage<User>('currentUser', 'Eugen');
    const [allUsersData, setAllUsersData] = useLocalStorage<AllUsersData>('crossfit_all_users_data', {
        'Eugen': { workouts: [], oneRepMaxes: [] },
        'Julia': { workouts: [], oneRepMaxes: [] },
        'Guest': { workouts: [], oneRepMaxes: [] },
    });
    const [view, setView] = useState<ViewType>('dashboard');

    // One-time data migration for workout structure
    useEffect(() => {
        let needsUpdate = false;
        const migratedData = JSON.parse(JSON.stringify(allUsersData));

        for (const user in migratedData) {
            // Using `any` to handle the old data structure before it conforms to the new `Workout` type
            migratedData[user].workouts.forEach((w: any) => {
                // Condition 1: Oldest structure with `description` and no `components`
                if (w.description && !w.components) {
                    needsUpdate = true;
                    const componentType = w.type === 'Metcon' || w.type === 'Endurance' || w.type === 'Strength' || w.type === 'Accessory' ? w.type : 'Metcon';
                    w.components = [{
                        type: componentType,
                        details: w.description,
                        score: w.score, // Move score
                    }];
                    delete w.description;
                    delete w.score;
                } 
                // Condition 2: Structure that has components but still has a top-level score
                else if (w.score && w.components?.length > 0) {
                    needsUpdate = true;
                    // Add score to the first component if it doesn't already have one
                    if (!w.components[0].score) {
                        w.components[0].score = w.score;
                    }
                    delete w.score;
                }
            });
        }

        if (needsUpdate) {
            console.log("Migrating workout data to add component scores...");
            setAllUsersData(migratedData);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on initial mount


    const { workouts, oneRepMaxes } = useMemo(() => {
        return allUsersData[currentUser] || { workouts: [], oneRepMaxes: [] };
    }, [allUsersData, currentUser]);

    const addWorkout = useCallback((workout: Omit<Workout, 'id'>) => {
        const newWorkout: Workout = { ...workout, id: Date.now().toString() };
        setAllUsersData(prev => {
            const userWorkouts = prev[currentUser]?.workouts || [];
            const updatedWorkouts = [...userWorkouts, newWorkout].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return {
                ...prev,
                [currentUser]: { ...(prev[currentUser] || { oneRepMaxes: [] }), workouts: updatedWorkouts }
            };
        });
    }, [currentUser, setAllUsersData]);

    const deleteWorkout = useCallback((id: string) => {
        if(window.confirm("Are you sure you want to delete this workout?")) {
            setAllUsersData(prev => {
                const userWorkouts = prev[currentUser]?.workouts || [];
                const updatedWorkouts = userWorkouts.filter(w => w.id !== id);
                return {
                    ...prev,
                    [currentUser]: { ...(prev[currentUser] || { oneRepMaxes: [] }), workouts: updatedWorkouts }
                };
            });
        }
    }, [currentUser, setAllUsersData]);

    const setOneRepMaxesForCurrentUser = useCallback((value: React.SetStateAction<OneRepMax[]>) => {
        setAllUsersData(prev => {
            const currentUserMaxes = prev[currentUser]?.oneRepMaxes || [];
            const newMaxes = value instanceof Function ? value(currentUserMaxes) : value;
            return {
                ...prev,
                [currentUser]: { ...(prev[currentUser] || { workouts: [] }), oneRepMaxes: newMaxes }
            };
        });
    }, [currentUser, setAllUsersData]);


    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard workouts={workouts} oneRepMaxes={oneRepMaxes} />;
            case 'log':
                return <LogWorkoutView addWorkout={addWorkout} setView={setView} />;
            case 'history':
                return <HistoryView workouts={workouts} deleteWorkout={deleteWorkout} />;
            case 'maxes':
                return <OneRepMaxView oneRepMaxes={oneRepMaxes} setOneRepMaxes={setOneRepMaxesForCurrentUser} />;
            case 'ai_creator':
                return <AiCreatorView />;
            default:
                return <Dashboard workouts={workouts} oneRepMaxes={oneRepMaxes} />;
        }
    };
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
        { id: 'log', label: 'Log WOD', icon: <PlusCircleIcon /> },
        { id: 'history', label: 'History', icon: <CalendarIcon /> },
        { id: 'maxes', label: '1-Rep Max', icon: <DumbbellIcon /> },
        { id: 'ai_creator', label: 'AI Creator', icon: <SparklesIcon /> },
    ];

    return (
        <div className="bg-primary min-h-screen text-text-light font-sans">
            <Header currentUser={currentUser} setCurrentUser={setCurrentUser} />
            <main className="pb-20">
                {renderView()}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-gray-700 flex justify-around">
                {navItems.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => setView(item.id as ViewType)}
                        className={`flex flex-col items-center justify-center p-3 text-center w-full transition-colors ${view === item.id ? 'text-accent' : 'text-text-dark hover:text-text-light'}`}
                    >
                        {React.cloneElement(item.icon, { className: 'w-6 h-6 mb-1' })}
                        <span className="text-xs">{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default App;