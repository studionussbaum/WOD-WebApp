import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { Workout, OneRepMax, ViewType, User, AllUsersData } from './types';

// Import newly created components and views
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Dashboard from './views/Dashboard';
import LogWorkoutView from './views/LogWorkoutView';
import HistoryView from './views/HistoryView';
import OneRepMaxView from './views/OneRepMaxView';
import AiCreatorView from './views/AiCreatorView';


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useLocalStorage<User>('currentUser', 'Eugen');
    const [allUsersData, setAllUsersData] = useLocalStorage<AllUsersData>('crossfit_all_users_data', {
        'Eugen': { workouts: [], oneRepMaxes: [] },
        'Julia': { workouts: [], oneRepMaxes: [] },
        'Guest': { workouts: [], oneRepMaxes: [] },
    });
    const [view, setView] = useState<ViewType>('dashboard');

    // One-time data migration for workout structure (remains here as it acts on the main data store)
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
    }, []);


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

    return (
        <div className="bg-primary min-h-screen text-text-light font-sans">
            <Header currentUser={currentUser} setCurrentUser={setCurrentUser} />
            <main className="pb-20">
                {renderView()}
            </main>
            <BottomNav currentView={view} setView={setView} />
        </div>
    );
};

export default App;
