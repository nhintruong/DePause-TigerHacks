import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { MoodQuadrant } from '../types';
import { MOOD_QUADRANTS } from '../constants/moods';

const NOTIF_STATE_KEY = 'depause_notif_state';

/**
 * Calculate seconds from now until a target hour:minute today (or tomorrow if past).
 */
function getSecondsUntilHour(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  // If target time already passed today, schedule for tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const diff = Math.floor((target.getTime() - now.getTime()) / 1000);
  return Math.max(diff, 60); // Minimum 60 seconds
}

interface NotifState {
  ignoredCount: number;         // consecutive ignored notifications
  lastMoodToday: MoodQuadrant | null;  // most recent mood check-in today
  lastCheckinTime: string | null;
}

// ============================================
// NOTIFICATION CONTENT
// ============================================

// Type A: Simple ask
const ASK_MESSAGES = [
  "Quick vibe check -- how's your day going?",
  "How are you feeling right now?",
  "Take 5 seconds. How's today?",
  "Mood check! One tap, that's all.",
  "Hey, how's it going today?",
];

// Type B: Social proof
const SOCIAL_MESSAGES = [
  "Students are checking in right now. Where do you fall?",
  "The campus heatmap just updated. Curious?",
  "See how campus is feeling today.",
];

// Type C: Spoiled / playful (Duolingo-style)
const SPOILED_MESSAGES = [
  "DePause noticed you didn't check in today. The heatmap misses you.",
  "Your streak is in danger. We're not saying we'll cry, but...",
  "Everyone else checked in today. Just saying.",
  "The campus mood map is looking lonely without you.",
  "We waited all day for your check-in. All. Day.",
];

// Type D: Celebration
const CELEBRATION_MESSAGES: Record<number, string> = {
  7: "7-day streak! You're officially committed.",
  14: "14 days! You know yourself better than most people ever will.",
  30: "30-day streak. That's a whole month of showing up for yourself.",
  60: "60 days. You're built different.",
  100: "100-day streak. Legend status.",
};

// Evening follow-up messages
function getEveningMessage(mood: MoodQuadrant): string {
  const label = MOOD_QUADRANTS[mood].label.toLowerCase();
  const messages: Record<MoodQuadrant, string[]> = {
    red: [
      `You checked in as stressed earlier. How about now?`,
      `Earlier today was rough. Has anything shifted?`,
      `You were feeling ${label} this morning. How's the evening?`,
    ],
    yellow: [
      `You were feeling good earlier! Still riding that wave?`,
      `Great vibes this morning. How's the evening going?`,
      `You checked in as ${label} today. Still feeling it?`,
    ],
    green: [
      `You were calm earlier. Hope the evening is just as peaceful.`,
      `Calm vibes this morning. Quick evening check-in?`,
      `Still feeling ${label}? One tap to track.`,
    ],
    blue: [
      `You were feeling low earlier. How are you doing now?`,
      `Checking in on you. How's the evening going?`,
      `Earlier was tough. Has anything helped?`,
    ],
  };

  const options = messages[mood];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================
// SETUP & PERMISSIONS
// ============================================

/**
 * Request notification permissions and configure notification handler.
 * Call this once during app startup.
 */
export async function setupNotifications() {
  // Set how notifications appear when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// ============================================
// SCHEDULING
// ============================================

/**
 * Schedule both daily notifications:
 * 1. Primary check-in at user's chosen hour
 * 2. Evening follow-up at 8 PM
 *
 * Call this after signup, after changing notification preferences,
 * and on each app open (to ensure they're still scheduled).
 */
export async function scheduleDailyNotifications(preferredHour: number = 12) {
  if (Platform.OS === 'web') return;

  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 1. Primary check-in notification
  const primaryMessage = await pickPrimaryMessage();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DePause',
        body: primaryMessage,
        data: { type: 'primary_checkin' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: getSecondsUntilHour(preferredHour, 30),
        repeats: false,
      },
    });
  } catch (e) {
    console.log('Primary notification scheduling skipped:', e);
  }

  // 2. Evening follow-up at 8 PM
  const state = await getNotifState();
  const eveningMessage = state.lastMoodToday
    ? getEveningMessage(state.lastMoodToday)
    : "End of day check-in. How are you feeling?";

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DePause',
        body: eveningMessage,
        data: { type: 'evening_followup' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: getSecondsUntilHour(20, 0),
        repeats: false,
      },
    });
  } catch (e) {
    console.log('Evening notification scheduling skipped:', e);
  }
}

/**
 * Pick a primary notification message based on adaptive rules.
 */
async function pickPrimaryMessage(): Promise<string> {
  const state = await getNotifState();

  // Rule: never send spoiled messages after a Blue check-in
  const allowSpoiled = state.lastMoodToday !== 'blue';

  // Rule: after 3+ ignored, only send gentle asks
  if (state.ignoredCount >= 3) {
    return ASK_MESSAGES[Math.floor(Math.random() * ASK_MESSAGES.length)];
  }

  // Weighted random selection
  const pools: { messages: string[]; weight: number }[] = [
    { messages: ASK_MESSAGES, weight: 40 },
    { messages: SOCIAL_MESSAGES, weight: 25 },
    { messages: allowSpoiled ? SPOILED_MESSAGES : ASK_MESSAGES, weight: 20 },
  ];

  const totalWeight = pools.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const pool of pools) {
    rand -= pool.weight;
    if (rand <= 0) {
      return pool.messages[Math.floor(Math.random() * pool.messages.length)];
    }
  }

  return ASK_MESSAGES[0];
}

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Record that the user checked in (updates notification state).
 * Called from the check-in pipeline after a successful check-in.
 */
export async function onCheckInCompleted(quadrant: MoodQuadrant) {
  const state = await getNotifState();
  state.lastMoodToday = quadrant;
  state.lastCheckinTime = new Date().toISOString();
  state.ignoredCount = 0; // Reset ignored count since they engaged
  await saveNotifState(state);

  // Reschedule evening notification with the actual mood
  await rescheduleEveningNotification(quadrant);
}

/**
 * Reschedule the evening notification to reference today's mood.
 */
async function rescheduleEveningNotification(mood: MoodQuadrant) {
  if (Platform.OS === 'web') return;

  // Cancel only the evening notification and reschedule
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'evening_followup') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  const message = getEveningMessage(mood);
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DePause',
        body: message,
        data: { type: 'evening_followup' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: getSecondsUntilHour(20, 0),
        repeats: false,
      },
    });
  } catch (e) {
    console.log('Evening reschedule skipped:', e);
  }
}

/**
 * Record that a notification was likely ignored (no check-in within 2 hours).
 * Called from a periodic check or app open.
 */
export async function onNotificationPossiblyIgnored() {
  const state = await getNotifState();
  state.ignoredCount++;
  await saveNotifState(state);
}

/**
 * Get a celebration message if the user hit a streak milestone.
 * Returns null if no milestone.
 */
export function getStreakCelebrationMessage(streak: number): string | null {
  return CELEBRATION_MESSAGES[streak] || null;
}

/**
 * Reset the daily mood tracking at midnight (for evening follow-up accuracy).
 * Call this on app open if it's a new day.
 */
export async function resetDailyState() {
  const state = await getNotifState();
  const lastCheckin = state.lastCheckinTime ? new Date(state.lastCheckinTime) : null;
  const now = new Date();

  // If last check-in was yesterday or earlier, reset daily mood
  if (!lastCheckin || lastCheckin.toDateString() !== now.toDateString()) {
    state.lastMoodToday = null;
    await saveNotifState(state);
  }
}

// ============================================
// PERSISTENCE
// ============================================

async function getNotifState(): Promise<NotifState> {
  const raw = await AsyncStorage.getItem(NOTIF_STATE_KEY);
  if (raw) return JSON.parse(raw);
  return { ignoredCount: 0, lastMoodToday: null, lastCheckinTime: null };
}

async function saveNotifState(state: NotifState) {
  await AsyncStorage.setItem(NOTIF_STATE_KEY, JSON.stringify(state));
}
