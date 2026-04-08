// Core types for DePause

export type MoodQuadrant = 'red' | 'yellow' | 'green' | 'blue';

export type SubEmotion =
  // Red
  | 'anxious' | 'frustrated' | 'angry' | 'overwhelmed' | 'stressed'
  // Yellow
  | 'happy' | 'excited' | 'motivated' | 'grateful' | 'hopeful'
  // Green
  | 'calm' | 'relaxed' | 'content' | 'peaceful' | 'refreshed'
  // Blue
  | 'sad' | 'lonely' | 'tired' | 'bored' | 'numb';

export type Context = 'academic' | 'social' | 'personal' | 'everything';

export type Preference = 'people' | 'quiet' | 'either';

export type ActivityType =
  | 'breathing' | 'nature' | 'social' | 'physical'
  | 'creative' | 'academic' | 'spiritual' | 'reflection'
  | 'event' | 'rest';

export type CrisisTier = 'tier1' | 'tier2' | 'tier3' | null;

export interface CheckIn {
  id: string;
  building_id: string;
  quadrant: MoodQuadrant;
  sub_emotion?: SubEmotion;
  context?: Context;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  quadrant: MoodQuadrant;
  sub_emotion?: SubEmotion;
  context?: Context;
  preference?: Preference;
  building_id?: string;
  created_at: string;
}

export interface Building {
  id: string;
  name: string;
  shortName: string;
  type: string;
  lat: number;
  lng: number;
  isWellbeing: boolean;
  resourceName?: string;
  resourceCategory?: string;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  location: string;
  building_id?: string;
  categories: string[];
  host?: string;
  image_url?: string;
  source_url: string;
}

export interface Suggestion {
  id: number;
  quadrant: MoodQuadrant;
  sub_emotion?: SubEmotion;
  context?: Context;
  title: string;
  description: string;
  building_id?: string;
  activityType: ActivityType;
  intensity: 'low' | 'medium' | 'high';
  soloOrGroup: 'solo' | 'group' | 'either';
  evidence?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  streak_count: number;
  streak_freeze: boolean;
  last_checkin?: string;
  notification_time: string;
  onboarding_done: boolean;
}

export interface MoodQuadrantInfo {
  key: MoodQuadrant;
  label: string;
  image: import('react-native').ImageSourcePropType;
  color: string;
  bgColor: string;
  subEmotions: SubEmotion[];
}
