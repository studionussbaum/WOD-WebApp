export type WorkoutType = 'Metcon' | 'Strength' | 'Endurance' | 'Accessory' | 'Rest Day';

export type WorkoutComponentType = 'Warm Up' | 'Strength' | 'Metcon' | 'Endurance' | 'Accessory' | 'Cool Down' | 'Other';

export const WORKOUT_COMPONENT_TYPES: WorkoutComponentType[] = ['Warm Up', 'Strength', 'Metcon', 'Endurance', 'Accessory', 'Cool Down', 'Other'];

export interface WorkoutComponent {
  type: WorkoutComponentType;
  details: string;
  score?: string;
}

export interface Workout {
  id: string;
  date: string; // ISO string format 'YYYY-MM-DD'
  type: WorkoutType; // Main focus of the day
  title: string;
  duration?: string; // e.g., "60 minutes", "1.5 hours"
  components: WorkoutComponent[];
  notes?: string;
  // Kept for seamless data migration of old records
  description?: string; 
}

export interface OneRepMax {
  lift: string;
  weight: number;
  date: string; // ISO string
}

export type ViewType = 'dashboard' | 'log' | 'history' | 'maxes' | 'ai_creator';


export const COMMON_LIFTS = [
  'Back Squat',
  'Front Squat',
  'Overhead Squat',
  'Deadlift',
  'Sumo Deadlift',
  'Bench Press',
  'Strict Press',
  'Push Press',
  'Push Jerk',
  'Snatch',
  'Clean and Jerk',
];

export const EQUIPMENT_LIST = [
    'Assault Bike',
    'Barbell',
    'Bike',
    'Box',
    'Dumbbell',
    'GHD',
    'Jump Rope',
    'Kettlebell',
    'Medicine Ball',
    'Pull-up Bar',
    'Rack',
    'Rings',
    'Ropes for ring rows',
    'Rower',
    'SkiErg',
    'None'
];

export const FOCUS_AREAS = [
    'Full Body',
    'Legs',
    'Shoulders',
    'Chest',
    'Back',
    'Core',
    'Endurance',
    'Aerobic Capacity',
    'Gymnastics',
    'Weightlifting'
];

export interface AiWorkout {
    wod: {
        name: string;
        format: string;
        duration: string;
        description: string;
        scalingOptions: {
            rx: string;
            intermediate: string;
        };
    };
    cooldown: {
        duration: string;
        stretches: {
            name: string;
            duration: string;
        }[];
    };
}

export type User = 'Eugen' | 'Julia' | 'Guest';

export const USERS: User[] = ['Hase', 'Maus', 'Guest'];

export interface UserData {
  workouts: Workout[];
  oneRepMaxes: OneRepMax[];
}

export type AllUsersData = Record<User, UserData>;
