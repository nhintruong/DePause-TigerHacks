import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJournal } from '../lib/checkin';
import { CrisisTier, JournalEntry, MoodQuadrant } from '../types';
import { differenceInCalendarDays, differenceInHours, parseISO } from 'date-fns';

const CRISIS_STATE_KEY = 'depause_crisis_state';

interface CrisisState {
  tier1ShownCount: number;
  tier2Triggered: boolean;
  lastTierShown: CrisisTier;
  lastShownAt: string | null;
}

export interface CrisisResult {
  tier: CrisisTier;
  message: string;
  secondaryMessage?: string;
  resources: CrisisResource[];
}

export interface CrisisResource {
  label: string;
  detail: string;
  phone?: string;
  sms?: string;
}

// DePauw-specific resources
const PEER_RESOURCES: CrisisResource[] = [
  { label: 'Mental Health Peer Advocates', detail: 'Students trained to listen. No judgment.' },
  { label: 'Wellness tips', detail: 'Small things that help, from students who get it.' },
];

const PROFESSIONAL_RESOURCES: CrisisResource[] = [
  { label: 'DePauw Counseling Services', detail: 'Free and confidential. Walk-ins: 11AM–12PM, 3–4PM', phone: '7656584268' },
  { label: 'Crisis Text Line', detail: 'Free, 24/7. Text HOME to 741741', sms: '741741' },
];

const IMMEDIATE_RESOURCES: CrisisResource[] = [
  { label: '988 Suicide & Crisis Lifeline', detail: 'Call or text, 24/7', phone: '988' },
  { label: 'Crisis Text Line', detail: 'Text HOME to 741741', sms: '741741' },
  { label: 'DePauw Counseling 24/7', detail: 'After-hours crisis support', phone: '7656584268' },
  { label: 'Trevor Project (LGBTQ+)', detail: 'Call 1-866-488-7386 or text START to 678-678', phone: '18664887386' },
];

/**
 * Run crisis detection on the user's local journal.
 * ALL processing happens on-device. Nothing is sent to server.
 *
 * Tier 1 (Gentle Check-In):
 *   - 3+ consecutive days of Blue or Red
 *   - 3+ selections of Sad or Numb in past 7 days
 *   - First check-in after 3+ day gap following a Blue check-in
 *
 * Tier 2 (Professional Resources):
 *   - 7+ consecutive days of Blue or Red
 *   - "Numb" selected 4+ times in past 10 days
 *   - "Sad" + "Lonely" both selected 2+ times in past 7 days
 *   - Tier 1 shown 2+ times and pattern continues
 *
 * Tier 3 (Immediate Support):
 *   - 14+ consecutive days negative
 *   - Rapid shift: Green/Yellow to all Blue/Red in 3 days
 *   - Blue check-in between 2–5 AM
 */
export async function detectCrisis(): Promise<CrisisResult | null> {
  const journal = await getJournal();
  if (journal.length === 0) return null;

  const state = await getCrisisState();
  const now = new Date();

  // Sort journal by date, most recent first
  const sorted = [...journal].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // === TIER 3 CHECKS (most severe, check first) ===

  // Check: 14+ consecutive days negative
  const consecutiveNegativeDays = countConsecutiveNegativeDays(sorted);
  if (consecutiveNegativeDays >= 14) {
    await updateCrisisState({ ...state, lastTierShown: 'tier3', lastShownAt: now.toISOString() });
    return buildTier3Result();
  }

  // Check: Rapid deterioration (was Green/Yellow, now all Blue/Red in 3 days)
  if (detectRapidDeterioration(sorted)) {
    await updateCrisisState({ ...state, lastTierShown: 'tier3', lastShownAt: now.toISOString() });
    return buildTier3Result();
  }

  // Check: Blue check-in between 2-5 AM
  const latestEntry = sorted[0];
  if (latestEntry) {
    const entryHour = new Date(latestEntry.created_at).getHours();
    if (latestEntry.quadrant === 'blue' && entryHour >= 2 && entryHour < 5) {
      await updateCrisisState({ ...state, lastTierShown: 'tier3', lastShownAt: now.toISOString() });
      return buildTier3Result();
    }
  }

  // === TIER 2 CHECKS ===

  // Check: 7+ consecutive days negative
  if (consecutiveNegativeDays >= 7) {
    await updateCrisisState({ ...state, tier2Triggered: true, lastTierShown: 'tier2', lastShownAt: now.toISOString() });
    return buildTier2Result();
  }

  // Check: "Numb" selected 4+ times in past 10 days
  const last10Days = getEntriesInLastNDays(sorted, 10);
  const numbCount = last10Days.filter((e) => e.sub_emotion === 'numb').length;
  if (numbCount >= 4) {
    await updateCrisisState({ ...state, tier2Triggered: true, lastTierShown: 'tier2', lastShownAt: now.toISOString() });
    return buildTier2Result();
  }

  // Check: "Sad" + "Lonely" both 2+ times in past 7 days
  const last7Days = getEntriesInLastNDays(sorted, 7);
  const sadCount = last7Days.filter((e) => e.sub_emotion === 'sad').length;
  const lonelyCount = last7Days.filter((e) => e.sub_emotion === 'lonely').length;
  if (sadCount >= 2 && lonelyCount >= 2) {
    await updateCrisisState({ ...state, tier2Triggered: true, lastTierShown: 'tier2', lastShownAt: now.toISOString() });
    return buildTier2Result();
  }

  // Check: Tier 1 shown 2+ times and pattern continues
  if (state.tier1ShownCount >= 2 && consecutiveNegativeDays >= 3) {
    await updateCrisisState({ ...state, tier2Triggered: true, lastTierShown: 'tier2', lastShownAt: now.toISOString() });
    return buildTier2Result();
  }

  // === TIER 1 CHECKS ===

  // Check: 3+ consecutive days of Blue or Red
  if (consecutiveNegativeDays >= 3) {
    const newCount = state.tier1ShownCount + 1;
    await updateCrisisState({ ...state, tier1ShownCount: newCount, lastTierShown: 'tier1', lastShownAt: now.toISOString() });
    return buildTier1Result();
  }

  // Check: 3+ selections of Sad or Numb in past 7 days
  const sadOrNumbCount = last7Days.filter(
    (e) => e.sub_emotion === 'sad' || e.sub_emotion === 'numb'
  ).length;
  if (sadOrNumbCount >= 3) {
    const newCount = state.tier1ShownCount + 1;
    await updateCrisisState({ ...state, tier1ShownCount: newCount, lastTierShown: 'tier1', lastShownAt: now.toISOString() });
    return buildTier1Result();
  }

  // Check: First check-in after 3+ day gap following a Blue check-in
  if (sorted.length >= 2) {
    const latest = sorted[0];
    const previous = sorted[1];
    const gapDays = differenceInCalendarDays(
      new Date(latest.created_at),
      new Date(previous.created_at)
    );
    if (gapDays >= 3 && previous.quadrant === 'blue') {
      const newCount = state.tier1ShownCount + 1;
      await updateCrisisState({ ...state, tier1ShownCount: newCount, lastTierShown: 'tier1', lastShownAt: now.toISOString() });
      return buildTier1Result();
    }
  }

  return null;
}

// === HELPER FUNCTIONS ===

function isNegative(quadrant: MoodQuadrant): boolean {
  return quadrant === 'blue' || quadrant === 'red';
}

/**
 * Count consecutive days ending today where the check-in was Blue or Red.
 */
function countConsecutiveNegativeDays(sorted: JournalEntry[]): number {
  if (sorted.length === 0) return 0;

  let count = 0;
  let currentDate: string | null = null;

  for (const entry of sorted) {
    const entryDate = entry.created_at.slice(0, 10); // YYYY-MM-DD

    // Skip duplicate entries for the same day (take the first/most recent)
    if (entryDate === currentDate) continue;
    currentDate = entryDate;

    if (isNegative(entry.quadrant)) {
      count++;
    } else {
      break; // Streak broken
    }
  }

  return count;
}

/**
 * Detect rapid deterioration: user was mostly Green/Yellow in the 7 days before
 * the last 3 days, but the last 3 days are all Blue/Red.
 */
function detectRapidDeterioration(sorted: JournalEntry[]): boolean {
  const last3Days = getEntriesInLastNDays(sorted, 3);
  const days4to7 = sorted.filter((e) => {
    const daysAgo = differenceInCalendarDays(new Date(), new Date(e.created_at));
    return daysAgo >= 3 && daysAgo <= 7;
  });

  if (last3Days.length < 2 || days4to7.length < 2) return false;

  const recentAllNegative = last3Days.every((e) => isNegative(e.quadrant));
  const previousMostlyPositive =
    days4to7.filter((e) => !isNegative(e.quadrant)).length / days4to7.length >= 0.6;

  return recentAllNegative && previousMostlyPositive;
}

function getEntriesInLastNDays(sorted: JournalEntry[], days: number): JournalEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return sorted.filter((e) => new Date(e.created_at) > cutoff);
}

// === TIER RESULT BUILDERS ===

function buildTier1Result(): CrisisResult {
  return {
    tier: 'tier1',
    message: "We've noticed you've been having a tough stretch. That takes courage to show up for.",
    secondaryMessage: 'Here are some people who get it.',
    resources: PEER_RESOURCES,
  };
}

function buildTier2Result(): CrisisResult {
  return {
    tier: 'tier2',
    message: 'Sometimes it helps to talk to someone who really knows how to listen.',
    resources: PROFESSIONAL_RESOURCES,
  };
}

function buildTier3Result(): CrisisResult {
  return {
    tier: 'tier3',
    message: 'You matter, and you don\'t have to go through this alone.',
    secondaryMessage: 'Would you like someone to reach out to you?',
    resources: IMMEDIATE_RESOURCES,
  };
}

// === CRISIS STATE PERSISTENCE ===

async function getCrisisState(): Promise<CrisisState> {
  const raw = await AsyncStorage.getItem(CRISIS_STATE_KEY);
  if (raw) return JSON.parse(raw);
  return {
    tier1ShownCount: 0,
    tier2Triggered: false,
    lastTierShown: null,
    lastShownAt: null,
  };
}

async function updateCrisisState(state: CrisisState) {
  await AsyncStorage.setItem(CRISIS_STATE_KEY, JSON.stringify(state));
}

/**
 * Check if the "Talk to someone" icon should be permanently visible.
 * Returns true after any Tier 2+ trigger.
 */
export async function shouldShowTalkIcon(): Promise<boolean> {
  const state = await getCrisisState();
  return state.tier2Triggered;
}
