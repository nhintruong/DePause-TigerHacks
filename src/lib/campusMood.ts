import { supabase } from './supabase';
import { MoodQuadrant } from '../types';
import { startOfDay } from 'date-fns';

export interface CampusMoodStats {
  totalCheckins: number;
  positivePercent: number;   // green + yellow as percentage
  breakdown: Record<MoodQuadrant, number>;  // count per quadrant
  dominantMood: MoodQuadrant | null;
  userCount: number;  // approximate unique users (by unique building+time combos)
}

/**
 * Get real-time campus mood stats from today's check-ins.
 * Queries the anonymous checkins table (no user data involved).
 */
export async function getCampusMood(): Promise<CampusMoodStats> {
  const todayStart = startOfDay(new Date()).toISOString();

  const { data, error } = await supabase
    .from('checkins')
    .select('quadrant')
    .gte('created_at', todayStart);

  if (error || !data || data.length === 0) {
    return {
      totalCheckins: 0,
      positivePercent: 0,
      breakdown: { red: 0, yellow: 0, green: 0, blue: 0 },
      dominantMood: null,
      userCount: 0,
    };
  }

  const breakdown: Record<MoodQuadrant, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const row of data) {
    const q = row.quadrant as MoodQuadrant;
    if (breakdown[q] !== undefined) {
      breakdown[q]++;
    }
  }

  const total = data.length;
  const positive = breakdown.green + breakdown.yellow;
  const positivePercent = total > 0 ? Math.round((positive / total) * 100) : 0;

  // Find dominant mood
  let dominantMood: MoodQuadrant | null = null;
  let maxCount = 0;
  for (const [mood, count] of Object.entries(breakdown)) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood as MoodQuadrant;
    }
  }

  return {
    totalCheckins: total,
    positivePercent,
    breakdown,
    dominantMood,
    userCount: total, // approximate since check-ins are anonymous
  };
}

/**
 * Get mood stats for a specific building in the last 6 hours.
 * Used for the heatmap building detail view.
 * Only returns data if 10+ check-ins (anonymity threshold).
 */
export async function getBuildingMood(buildingId: string) {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('checkins')
    .select('quadrant')
    .eq('building_id', buildingId)
    .gte('created_at', sixHoursAgo);

  if (error || !data || data.length < 10) {
    return null; // Not enough data for anonymity
  }

  const breakdown: Record<MoodQuadrant, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const row of data) {
    const q = row.quadrant as MoodQuadrant;
    if (breakdown[q] !== undefined) breakdown[q]++;
  }

  const total = data.length;
  return {
    totalCheckins: total,
    breakdown,
    percentages: {
      red: Math.round((breakdown.red / total) * 100),
      yellow: Math.round((breakdown.yellow / total) * 100),
      green: Math.round((breakdown.green / total) * 100),
      blue: Math.round((breakdown.blue / total) * 100),
    },
  };
}
