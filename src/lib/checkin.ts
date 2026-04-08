import { supabase } from './supabase';
import { MoodQuadrant, SubEmotion, Context, Preference, JournalEntry } from '../types';
import { differenceInCalendarDays, format } from 'date-fns';

interface CheckInInput {
  quadrant: MoodQuadrant;
  building_id?: string;
  sub_emotion?: SubEmotion;
  context?: Context;
  preference?: Preference;
}

/**
 * Submit a check-in. Three writes happen:
 * A) Anonymous check-in → Supabase checkins table (for heatmap, NO user_id)
 * B) Private journal entry → Supabase journal table (synced across devices, RLS protected)
 * C) Streak update → Supabase profiles table
 */
export async function submitCheckIn(input: CheckInInput) {
  const [checkinResult, journalResult, streakResult] = await Promise.allSettled([
    writeAnonymousCheckIn(input),
    writeJournal(input),
    updateStreak(),
  ]);

  return {
    checkinOk: checkinResult.status === 'fulfilled',
    journalOk: journalResult.status === 'fulfilled',
    streakOk: streakResult.status === 'fulfilled',
    streak: streakResult.status === 'fulfilled' ? streakResult.value : null,
  };
}

/**
 * Write A: Anonymous check-in to Supabase.
 * NO user_id attached. Cannot be traced back to the user.
 */
async function writeAnonymousCheckIn(input: CheckInInput) {
  const { error } = await supabase.from('checkins').insert({
    building_id: input.building_id || null,
    quadrant: input.quadrant,
    sub_emotion: input.sub_emotion || null,
    context: input.context || null,
  });

  if (error) throw error;
}

/**
 * Write B: Private journal entry to Supabase.
 * Protected by RLS -- only the owner can read/write their entries.
 * Syncs across devices automatically.
 */
async function writeJournal(input: CheckInInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('journal').insert({
    user_id: user.id,
    quadrant: input.quadrant,
    sub_emotion: input.sub_emotion || null,
    context: input.context || null,
    preference: input.preference || null,
    building_id: input.building_id || null,
  });

  if (error) throw error;
}

/**
 * Write C: Update the user's streak in Supabase profiles table.
 * Grace period: streak day ends at 2:00 AM, not midnight.
 */
async function updateStreak(): Promise<{ streak_count: number; milestone: number | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('streak_count, streak_freeze, last_checkin')
    .eq('id', user.id)
    .single();

  if (error || !profile) throw error || new Error('Profile not found');

  // Apply 2AM grace period: if it's before 2AM, treat as yesterday
  const now = new Date();
  const effectiveDate = now.getHours() < 2
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayStr = format(effectiveDate, 'yyyy-MM-dd');

  // Already checked in today
  if (profile.last_checkin === todayStr) {
    return { streak_count: profile.streak_count, milestone: null };
  }

  let newStreak = profile.streak_count;
  let newFreeze = profile.streak_freeze;

  if (profile.last_checkin) {
    const lastDate = new Date(profile.last_checkin);
    const daysDiff = differenceInCalendarDays(effectiveDate, lastDate);

    if (daysDiff === 1) {
      newStreak += 1;
    } else if (daysDiff === 2 && profile.streak_freeze) {
      newStreak += 1;
      newFreeze = false;
    } else {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  await supabase
    .from('profiles')
    .update({
      streak_count: newStreak,
      streak_freeze: newFreeze,
      last_checkin: todayStr,
    })
    .eq('id', user.id);

  const milestones = [7, 14, 30, 60, 100];
  const milestone = milestones.includes(newStreak) ? newStreak : null;

  return { streak_count: newStreak, milestone };
}

/**
 * Get the user's journal entries from Supabase.
 * Protected by RLS -- only returns the current user's entries.
 * Used for: personal timeline, crisis detection, mood trends.
 */
export async function getJournal(): Promise<JournalEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('journal')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching journal:', error);
    return [];
  }

  return data || [];
}

/**
 * Get the user's current streak from Supabase.
 */
export async function getStreak(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data } = await supabase
    .from('profiles')
    .select('streak_count')
    .eq('id', user.id)
    .single();

  return data?.streak_count || 0;
}
