import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodQuadrant, SubEmotion, Context, Preference, Suggestion, CampusEvent } from '../types';

const SEEN_KEY = 'depause_seen_suggestions';
const MAX_RESULTS = 3;

interface SuggestionInput {
  quadrant: MoodQuadrant;
  sub_emotion?: SubEmotion;
  context?: Context;
  preference?: Preference;
}

export interface SuggestionResult {
  suggestion: Suggestion;
  relatedEvent?: CampusEvent;
}

/**
 * The suggestion engine. Takes the user's mood state and returns
 * 2-3 evidence-based, DePauw-specific suggestions.
 *
 * Pipeline:
 * 1. Query rules database (filtered by quadrant + sub_emotion + context)
 * 2. Filter by preference (people vs quiet)
 * 3. Cross-reference live campus events
 * 4. Remove recently seen suggestions (novelty)
 * 5. Return top 2-3 results
 */
export async function getSuggestions(input: SuggestionInput): Promise<SuggestionResult[]> {
  // Step 1: Query rules database
  // Fetch suggestions matching the quadrant. Include both specific and general matches.
  let query = supabase
    .from('suggestions')
    .select('*')
    .eq('quadrant', input.quadrant);

  const { data: allSuggestions, error } = await query;
  if (error || !allSuggestions) return [];

  // Score and sort: specific matches rank higher than general ones
  const scored = allSuggestions.map((s: Suggestion) => {
    let score = 0;
    if (s.sub_emotion === input.sub_emotion) score += 3;
    if (s.sub_emotion === null) score += 1; // general suggestions are okay fallbacks
    if (s.context === input.context) score += 2;
    if (s.context === null) score += 1;
    // Penalize mismatches
    if (s.sub_emotion && s.sub_emotion !== input.sub_emotion) score -= 2;
    if (s.context && s.context !== input.context) score -= 1;
    return { ...s, _score: score };
  });

  // Filter out poor matches (negative score = wrong sub_emotion/context)
  const viable = scored
    .filter((s) => s._score >= 0)
    .sort((a, b) => b._score - a._score);

  // Step 2: Filter by preference
  let filtered = viable;
  if (input.preference === 'people') {
    filtered = viable.filter((s) => s.solo_or_group !== 'solo');
  } else if (input.preference === 'quiet') {
    filtered = viable.filter((s) => s.solo_or_group !== 'group');
  }
  // If filtering removed everything, fall back to unfiltered
  if (filtered.length === 0) filtered = viable;

  // Step 3: Cross-reference live campus events (next 4 hours)
  const now = new Date();
  const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('*')
    .gte('start_time', now.toISOString())
    .lte('start_time', fourHoursLater.toISOString())
    .order('start_time', { ascending: true })
    .limit(10);

  // Step 4: Remove recently seen suggestions (last 3 days)
  const recentlySeen = await getRecentlySeen();
  const fresh = filtered.filter((s) => !recentlySeen.includes(s.id));
  // If all have been seen, reset and use all
  const pool = fresh.length >= MAX_RESULTS ? fresh : filtered;

  // Step 5: Select top results with variety
  // Try to mix: 1 immediate action + 1 resource + 1 event-related
  const results: SuggestionResult[] = [];
  const used = new Set<number>();

  // First: try to find one that matches a live event
  if (upcomingEvents && upcomingEvents.length > 0) {
    for (const event of upcomingEvents) {
      const matchingSugg = pool.find(
        (s) => s.building_id === event.building_id && !used.has(s.id)
      );
      if (matchingSugg) {
        used.add(matchingSugg.id);
        results.push({ suggestion: matchingSugg, relatedEvent: event });
        break;
      }
    }

    // If no building match, add a general event suggestion
    if (results.length === 0) {
      const eventSugg = pool.find(
        (s) => s.activity_type === 'event' || s.activity_type === 'social'
      );
      if (eventSugg && !used.has(eventSugg.id)) {
        used.add(eventSugg.id);
        results.push({ suggestion: eventSugg, relatedEvent: upcomingEvents[0] });
      }
    }
  }

  // Fill remaining slots from pool (up to MAX_RESULTS)
  for (const s of pool) {
    if (results.length >= MAX_RESULTS) break;
    if (used.has(s.id)) continue;
    used.add(s.id);
    results.push({ suggestion: s });
  }

  // Track what we showed (for novelty on next check-in)
  await markAsSeen(results.map((r) => r.suggestion.id));

  return results;
}

/**
 * Get suggestion IDs the user has seen in the last 3 days.
 */
async function getRecentlySeen(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(SEEN_KEY);
  if (!raw) return [];

  const entries: { id: number; seen_at: string }[] = JSON.parse(raw);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  return entries
    .filter((e) => new Date(e.seen_at) > threeDaysAgo)
    .map((e) => e.id);
}

/**
 * Mark suggestion IDs as seen (for novelty tracking).
 */
async function markAsSeen(ids: number[]) {
  const raw = await AsyncStorage.getItem(SEEN_KEY);
  const existing: { id: number; seen_at: string }[] = raw ? JSON.parse(raw) : [];

  const now = new Date().toISOString();
  const newEntries = ids.map((id) => ({ id, seen_at: now }));

  // Keep only last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const trimmed = [...existing, ...newEntries].filter(
    (e) => new Date(e.seen_at) > sevenDaysAgo
  );

  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
}
