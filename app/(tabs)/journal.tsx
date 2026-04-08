import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  subMonths,
  addMonths,
  isToday,
  isAfter,
} from 'date-fns';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { getJournal, getStreak } from '../../src/lib/checkin';
import { MOOD_QUADRANTS, SUB_EMOTION_LABELS, CONTEXT_OPTIONS } from '../../src/constants/moods';
import { JournalEntry, MoodQuadrant, SubEmotion } from '../../src/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STREAK_MILESTONES = [7, 14, 30, 60, 100];

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_PADDING = spacing.lg * 2 + spacing.md * 2; // container + card padding
const CELL_SIZE = Math.floor((SCREEN_WIDTH - CALENDAR_PADDING) / 7);

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getJournal(), getStreak()]).then(([journal, s]) => {
        setEntries(journal);
        setStreak(s);
      });
    }, [])
  );

  // Group entries by date string (YYYY-MM-DD)
  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    entries.forEach((e) => {
      const key = format(new Date(e.created_at), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  // Dominant mood for a date
  const getDominantMood = (dateKey: string): MoodQuadrant | null => {
    const dayEntries = entriesByDate[dateKey];
    if (!dayEntries || dayEntries.length === 0) return null;
    const counts: Record<string, number> = {};
    dayEntries.forEach((e) => {
      counts[e.quadrant] = (counts[e.quadrant] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as MoodQuadrant;
  };

  // Calendar days for current month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDow = getDay(start);
    const padded: (Date | null)[] = Array(startDow).fill(null);
    return [...padded, ...days];
  }, [currentMonth]);

  // Selected day entries
  const selectedEntries = selectedDate ? entriesByDate[selectedDate] || [] : [];

  // Mood trends
  const trends = useMemo(() => {
    if (entries.length < 3) return null;

    // Best day of week
    const dayScores: Record<number, { positive: number; total: number }> = {};
    entries.forEach((e) => {
      const dow = getDay(new Date(e.created_at));
      if (!dayScores[dow]) dayScores[dow] = { positive: 0, total: 0 };
      dayScores[dow].total++;
      if (e.quadrant === 'yellow' || e.quadrant === 'green') {
        dayScores[dow].positive++;
      }
    });

    let bestDay = 0;
    let bestRatio = 0;
    Object.entries(dayScores).forEach(([day, score]) => {
      const ratio = score.total > 0 ? score.positive / score.total : 0;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestDay = Number(day);
      }
    });

    // Most common mood
    const moodCounts: Record<string, number> = {};
    entries.forEach((e) => {
      moodCounts[e.quadrant] = (moodCounts[e.quadrant] || 0) + 1;
    });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

    // Most common sub-emotion
    const subCounts: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.sub_emotion) {
        subCounts[e.sub_emotion] = (subCounts[e.sub_emotion] || 0) + 1;
      }
    });
    const topSub = Object.entries(subCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      bestDay: DAY_NAMES[bestDay],
      bestDayRatio: Math.round(bestRatio * 100),
      topMood: topMood ? (topMood[0] as MoodQuadrant) : null,
      topMoodCount: topMood ? topMood[1] : 0,
      topSubEmotion: topSub ? (topSub[0] as SubEmotion) : null,
      topSubCount: topSub ? topSub[1] : 0,
      totalCheckins: entries.length,
    };
  }, [entries]);

  // Streak milestones
  const nextMilestone = STREAK_MILESTONES.find((m) => m > streak) || null;
  const lastMilestone = [...STREAK_MILESTONES].reverse().find((m) => m <= streak) || null;

  const canGoForward = !isAfter(
    startOfMonth(addMonths(currentMonth, 1)),
    startOfMonth(new Date())
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Journal</Text>

        {/* Empty state */}
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No check-ins yet</Text>
            <Text style={styles.emptyText}>
              Your mood history will appear here after your first check-in.
              Each day becomes a colored square matching how you felt.
            </Text>
          </View>
        )}

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => {
              setCurrentMonth(subMonths(currentMonth, 1));
              setSelectedDate(null);
            }}
            hitSlop={12}
          >
            <View style={styles.navButton}>
              <Text style={styles.navArrow}>{'<'}</Text>
            </View>
          </Pressable>
          <Text style={styles.monthLabel}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <Pressable
            onPress={() => {
              if (canGoForward) {
                setCurrentMonth(addMonths(currentMonth, 1));
                setSelectedDate(null);
              }
            }}
            hitSlop={12}
          >
            <View style={[styles.navButton, !canGoForward && { opacity: 0.3 }]}>
              <Text style={styles.navArrow}>{'>'}</Text>
            </View>
          </Pressable>
        </View>

        {/* Calendar heatmap */}
        <View style={styles.calendarCard}>
          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((d) => (
              <Text key={d} style={styles.dayName}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, i) => {
              if (!day) {
                return <View key={`pad-${i}`} style={styles.dayCell} />;
              }

              const dateKey = format(day, 'yyyy-MM-dd');
              const mood = getDominantMood(dateKey);
              const isSelected = selectedDate === dateKey;
              const isFuture = isAfter(day, new Date());
              const count = entriesByDate[dateKey]?.length || 0;

              return (
                <Pressable
                  key={dateKey}
                  onPress={() => {
                    if (!isFuture) {
                      setSelectedDate(isSelected ? null : dateKey);
                    }
                  }}
                  style={[
                    styles.dayCell,
                    mood && { backgroundColor: MOOD_QUADRANTS[mood].color },
                    !mood && !isFuture && { backgroundColor: colors.divider },
                    isFuture && { backgroundColor: 'transparent' },
                    isToday(day) && !mood && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      mood && { color: '#FFF' },
                      isFuture && { color: colors.textLight },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {count > 1 && (
                    <Text style={[styles.dayCount, mood && { color: '#FFF' }]}>
                      {count}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {Object.values(MOOD_QUADRANTS).map((q) => (
              <View key={q.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: q.color }]} />
                <Text style={styles.legendLabel}>{q.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selected day detail */}
        {selectedDate && selectedEntries.length > 0 && (
          <View style={styles.detailCard}>
            <Text style={styles.detailDate}>
              {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d')}
            </Text>
            {selectedEntries.map((entry) => {
              const quad = MOOD_QUADRANTS[entry.quadrant];
              return (
                <View
                  key={entry.id}
                  style={[styles.entryRow, { backgroundColor: quad.bgColor }]}
                >
                  <Image source={quad.image} style={styles.entryImage} />
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryMood, { color: quad.color }]}>
                      {quad.label}
                      {entry.sub_emotion &&
                        ` -- ${SUB_EMOTION_LABELS[entry.sub_emotion]}`}
                    </Text>
                    {entry.context && (
                      <Text style={styles.entryContext}>
                        {CONTEXT_OPTIONS.find((c) => c.key === entry.context)
                          ?.label || entry.context}
                      </Text>
                    )}
                    <Text style={styles.entryTime}>
                      {format(new Date(entry.created_at), 'h:mm a')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {selectedDate && selectedEntries.length === 0 && (
          <View style={styles.detailCard}>
            <Text style={styles.detailDate}>
              {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d')}
            </Text>
            <Text style={styles.emptyDay}>No check-ins this day</Text>
          </View>
        )}

        {/* Mood insights */}
        {trends && (
          <View style={styles.insightsCard}>
            <Text style={styles.insightsTitle}>Your Mood Insights</Text>

            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Total check-ins</Text>
              <Text style={styles.insightValue}>{trends.totalCheckins}</Text>
            </View>

            {trends.topMood && (
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Most common mood</Text>
                <Text
                  style={[
                    styles.insightValue,
                    { color: MOOD_QUADRANTS[trends.topMood].color },
                  ]}
                >
                  {MOOD_QUADRANTS[trends.topMood].label}
                </Text>
              </View>
            )}

            {trends.topSubEmotion && (
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Top feeling</Text>
                <Text style={styles.insightValue}>
                  {SUB_EMOTION_LABELS[trends.topSubEmotion]}
                </Text>
              </View>
            )}

            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>You feel best on</Text>
              <Text style={styles.insightValue}>
                {trends.bestDay}s ({trends.bestDayRatio}% positive)
              </Text>
            </View>
          </View>
        )}

        {/* Streak milestones */}
        <View style={styles.streakCard}>
          <Text style={styles.streakTitle}>Streak</Text>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>
            day{streak !== 1 ? 's' : ''} in a row
          </Text>

          {nextMilestone && (
            <View style={styles.milestoneSection}>
              <Text style={styles.milestoneTarget}>
                Next milestone: {nextMilestone} days
              </Text>
              <View style={styles.milestoneBar}>
                <View
                  style={[
                    styles.milestoneProgress,
                    {
                      width: `${Math.min(
                        ((streak - (lastMilestone || 0)) /
                          (nextMilestone - (lastMilestone || 0))) *
                          100,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {lastMilestone && (
            <View style={styles.reachedMilestones}>
              {STREAK_MILESTONES.filter((m) => m <= streak).map((m) => (
                <View key={m} style={styles.milestoneBadge}>
                  <Text style={styles.milestoneBadgeText}>{m}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  // Empty state
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Month navigator
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  navArrow: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  monthLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
  },

  // Calendar
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dayName: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textLight,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayCellSelected: {
    borderWidth: 2.5,
    borderColor: colors.text,
  },
  dayNumber: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayCount: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textLight,
    marginTop: -2,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Day detail
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  detailDate: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  entryImage: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  entryInfo: {
    flex: 1,
  },
  entryMood: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  entryContext: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryTime: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  emptyDay: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  // Insights
  insightsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  insightsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  insightLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  insightValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: '700',
  },

  // Streak
  streakCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.soft,
  },
  streakTitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  streakNumber: {
    fontSize: typography.sizes.hero,
    fontWeight: '800',
    color: colors.text,
  },
  streakLabel: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  milestoneSection: {
    width: '100%',
    marginTop: spacing.sm,
  },
  milestoneTarget: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  milestoneBar: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  milestoneProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  reachedMilestones: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  milestoneBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  milestoneBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: '#FFF',
  },
});
