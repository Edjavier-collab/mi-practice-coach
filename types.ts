// FIX: Removed self-import of `StageOfChange` which was causing a circular dependency
// and conflicting declarations. The enum is defined within this file.

export enum UserTier {
  Free = 'free',
  Premium = 'premium',
}

export enum View {
  Login = 'login',
  ForgotPassword = 'forgotPassword',
  Dashboard = 'dashboard',
  Practice = 'practice',
  Feedback = 'feedback',
  History = 'history',
  ResourceLibrary = 'resourceLibrary',
  Paywall = 'paywall',
  Settings = 'settings',
  ScenarioSelection = 'scenarioSelection',
  Calendar = 'calendar',
  CoachingSummary = 'coachingSummary',
}

export enum StageOfChange {
  Precontemplation = 'Precontemplation',
  Contemplation = 'Contemplation',
  Preparation = 'Preparation',
  Action = 'Action',
  Maintenance = 'Maintenance',
}

export enum DifficultyLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
}

export interface PatientProfile {
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Non-binary';
  background: string;
  presentingProblem: string;
  topic: string;
  history: string;
  chiefComplaint: string;
  stageOfChange: StageOfChange;
}

export interface PatientProfileFilters {
  topic?: string;
  stageOfChange?: StageOfChange;
  difficulty?: DifficultyLevel;
}

export interface ChatMessage {
    author: 'user' | 'patient';
    text: string;
}

export interface Feedback {
    whatWentRight: string; // Stays for free tier compatibility and as a premium summary
    keyTakeaway?: string;
    empathyScore?: number;
    constructiveFeedback?: string; // Formerly areasForGrowth
    keySkillsUsed?: string[]; // Changed from string to string[]
    nextPracticeFocus?: string;
}

export interface Session {
    id: string;
    date: string;
    patient: PatientProfile;
    transcript: ChatMessage[];
    feedback: Feedback;
    tier: UserTier;
}

export interface CoachingSummary {
    totalSessions: number;
    dateRange: string;
    strengthsAndTrends: string;
    areasForFocus: string;
    summaryAndNextSteps: string;
}