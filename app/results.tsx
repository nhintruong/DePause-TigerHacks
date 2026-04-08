import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, shadows } from '../src/constants/theme';
import { MOOD_QUADRANTS } from '../src/constants/moods';
import { mascotImages } from '../src/constants/images';
import { MoodQuadrant, SubEmotion, Context, Preference } from '../src/types';
import { submitCheckIn, getStreak } from '../src/lib/checkin';
import { getSuggestions, SuggestionResult } from '../src/engine/suggestions';
import { getCampusMood, CampusMoodStats } from '../src/lib/campusMood';
import { detectCrisis, CrisisResult } from '../src/engine/crisis';
import { onCheckInCompleted } from '../src/lib/notifications';
import { BUILDINGS } from '../src/data/buildings';
import { format } from 'date-fns';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    quadrant: MoodQuadrant;
    building_id: string;
    sub_emotion: string;
    context: string;
    preference: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [campusMood, setCampusMood] = useState<CampusMoodStats | null>(null);
  const [crisis, setCrisis] = useState<CrisisResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const mood = MOOD_QUADRANTS[params.quadrant];
  const isPositive = params.quadrant === 'green' || params.quadrant === 'yellow';

  useEffect(() => {
    if (submitted) return;
    setSubmitted(true);

    async function run() {
      try {
        const [checkinResult, suggestionsResult, moodResult, streakResult, crisisResult] = await Promise.allSettled([
          submitCheckIn({
            quadrant: params.quadrant,
            building_id: params.building_id || undefined,
            sub_emotion: (params.sub_emotion as SubEmotion) || undefined,
            context: (params.context as Context) || undefined,
            preference: (params.preference as Preference) || undefined,
          }),
          getSuggestions({
            quadrant: params.quadrant,
            sub_emotion: (params.sub_emotion as SubEmotion) || undefined,
            context: (params.context as Context) || undefined,
            preference: (params.preference as Preference) || undefined,
          }),
          getCampusMood(),
          getStreak(),
          detectCrisis(),
        ]);

        if (suggestionsResult.status === 'fulfilled') {
          setSuggestions(suggestionsResult.value);
        }
        if (moodResult.status === 'fulfilled') {
          setCampusMood(moodResult.value);
        }
        if (streakResult.status === 'fulfilled') {
          setStreak(streakResult.value);
        }
        if (checkinResult.status === 'fulfilled' && checkinResult.value.streak?.streak_count) {
          setStreak(checkinResult.value.streak.streak_count);
        }
        // Update evening notification with today's mood
        onCheckInCompleted(params.quadrant);
        if (crisisResult.status === 'fulfilled' && crisisResult.value) {
          setCrisis(crisisResult.value);
        }
      } catch (err) {
        console.error('Results loading error:', err);
      } finally {
        setLoading(false);
      }
    }

    run();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <Image source={mascotImages.peek} style={styles.loadingMascot} resizeMode="contain" />
        <ActivityIndicator size="large" color={mood.color} />
        <Text style={styles.loadingText}>Finding suggestions for you...</Text>
      </SafeAreaView>
    );
  }

  const getBuildingName = (id?: string) => {
    if (!id) return null;
    return BUILDINGS.find((b) => b.id === id)?.shortName;
  };

  const formatEventTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMin = Math.round((start.getTime() - now.getTime()) / 60000);
    if (diffMin <= 0) return 'happening now';
    if (diffMin < 60) return `in ${diffMin} min`;
    return `at ${format(start, 'h:mm a')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Streak Card */}
        <View style={styles.streakCard}>
          <Text style={styles.streakText}>
            {streak > 0 ? `${streak}-day streak!` : 'Check in tomorrow to start your streak!'}
          </Text>
        </View>

        {/* Mood Acknowledgment with real campus mood */}
        <View style={[styles.moodCard, { backgroundColor: mood.bgColor }]}>
          <Image source={mood.image} style={styles.moodImage} resizeMode="cover" />
          <Text style={[styles.moodText, { color: mood.color }]}>
            {isPositive
              ? campusMood && campusMood.totalCheckins > 0
                ? `Nice! You and ${campusMood.positivePercent}% of campus are feeling good today.`
                : "Nice! You're one of the first to check in today."
              : "Thanks for checking in. Here's what might help."}
          </Text>
        </View>

        {/* Crisis Card (shown only if tier detected) */}
        {crisis && crisis.tier === 'tier1' && (
          <View style={[styles.crisisCard, { backgroundColor: colors.crisisGentleBg }]}>
            <Image source={mascotImages.hug} style={styles.crisisMascot} resizeMode="contain" />
            <Text style={styles.crisisMessage}>{crisis.message}</Text>
            {crisis.secondaryMessage && (
              <Text style={styles.crisisSecondary}>{crisis.secondaryMessage}</Text>
            )}
            {crisis.resources.map((r, i) => (
              <Text key={i} style={styles.crisisResourceText}>{r.label} — {r.detail}</Text>
            ))}
          </View>
        )}

        {crisis && crisis.tier === 'tier2' && (
          <View style={[styles.crisisCard, { backgroundColor: colors.crisisProfessionalBg }]}>
            <Text style={styles.crisisMessage}>{crisis.message}</Text>
            {crisis.resources.map((r, i) => (
              <Pressable
                key={i}
                style={styles.crisisResourceButton}
                onPress={() => {
                  if (r.phone) Linking.openURL(`tel:${r.phone}`);
                  else if (r.sms) Linking.openURL(`sms:${r.sms}&body=HOME`);
                }}
              >
                <Text style={styles.crisisResourceLabel}>{r.label}</Text>
                <Text style={styles.crisisResourceDetail}>{r.detail}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {crisis && crisis.tier === 'tier3' && (
          <View style={[styles.crisisCard, { backgroundColor: colors.crisisImmediateBg }]}>
            <Image source={mascotImages.hug} style={styles.crisisMascot} resizeMode="contain" />
            <Text style={styles.crisisMessage}>{crisis.message}</Text>
            <Text style={styles.crisisSecondary}>{crisis.secondaryMessage}</Text>

            <Pressable
              style={styles.crisisActionButton}
              onPress={() => router.push('/talk')}
            >
              <Text style={styles.crisisActionText}>Yes, I'd like that</Text>
            </Pressable>

            <View style={styles.crisisDivider} />
            <Text style={styles.crisisOrText}>Or reach out directly:</Text>

            {crisis.resources.map((r, i) => (
              <Pressable
                key={i}
                style={styles.crisisResourceButton}
                onPress={() => {
                  if (r.phone) Linking.openURL(`tel:${r.phone}`);
                  else if (r.sms) Linking.openURL(`sms:${r.sms}&body=HOME`);
                }}
              >
                <Text style={styles.crisisResourceLabel}>{r.label}</Text>
                <Text style={styles.crisisResourceDetail}>{r.detail}</Text>
              </Pressable>
            ))}

            <Pressable style={styles.crisisDismiss}>
              <Text style={styles.crisisDismissText}>I'm okay, just having a rough time</Text>
            </Pressable>
          </View>
        )}

        {/* Suggestions (real, from suggestion engine) */}
        {!isPositive && suggestions.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggestions for you</Text>
            </View>

            {suggestions.map((result, index) => {
              const { suggestion, relatedEvent } = result;
              const buildingName = getBuildingName(suggestion.building_id || undefined);

              return (
                <View key={suggestion.id || index} style={styles.suggestionCard}>
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <Text style={styles.suggestionDesc}>{suggestion.description}</Text>

                  {relatedEvent && (
                    <View style={styles.eventBadge}>
                      <Text style={styles.eventBadgeText}>
                        {relatedEvent.title} — {formatEventTime(relatedEvent.start_time)}
                        {relatedEvent.location ? ` at ${relatedEvent.location}` : ''}
                      </Text>
                    </View>
                  )}

                  {suggestion.evidence && (
                    <Text style={styles.evidenceText}>{suggestion.evidence}</Text>
                  )}

                  {buildingName && (
                    <Pressable
                      style={styles.directionButton}
                      onPress={() => {
                        const building = BUILDINGS.find((b) => b.id === suggestion.building_id);
                        if (building) {
                          Linking.openURL(
                            `https://www.google.com/maps/dir/?api=1&destination=${building.lat},${building.lng}&travelmode=walking`
                          );
                        }
                      }}
                    >
                      <Text style={styles.directionText}>{buildingName} — Get directions</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* Positive path */}
        {isPositive && (
          <View style={styles.suggestionCard}>
            <Image source={mascotImages.celebrate} style={styles.miniMascot} resizeMode="contain" />
            <Text style={styles.suggestionTitle}>Want to see what's happening on campus?</Text>
            <Pressable
              style={styles.directionButton}
              onPress={() => router.replace('/(tabs)/events')}
            >
              <Text style={styles.directionText}>View events</Text>
            </Pressable>
          </View>
        )}

        {/* No suggestions fallback */}
        {!isPositive && suggestions.length === 0 && (
          <View style={styles.suggestionCard}>
            <Image source={mascotImages.hug} style={styles.miniMascot} resizeMode="contain" />
            <Text style={styles.suggestionTitle}>We hear you.</Text>
            <Text style={styles.suggestionDesc}>
              Sometimes there are no perfect suggestions. But you checked in, and that matters.
            </Text>
          </View>
        )}

        {/* Campus Mood Card (real data) */}
        <View style={styles.campusMoodCard}>
          <Text style={styles.campusMoodTitle}>Campus mood right now</Text>
          {campusMood && campusMood.totalCheckins >= 5 ? (
            <>
              <View style={styles.moodBar}>
                {(['green', 'yellow', 'red', 'blue'] as MoodQuadrant[]).map((q) => {
                  const percent = campusMood.totalCheckins > 0
                    ? (campusMood.breakdown[q] / campusMood.totalCheckins) * 100
                    : 0;
                  if (percent === 0) return null;
                  return (
                    <View
                      key={q}
                      style={[
                        styles.moodBarSegment,
                        { backgroundColor: MOOD_QUADRANTS[q].color, flex: percent },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.campusMoodSub}>
                {campusMood.totalCheckins} check-ins today
              </Text>
            </>
          ) : (
            <Text style={styles.campusMoodSub}>
              {campusMood && campusMood.totalCheckins > 0
                ? `${campusMood.totalCheckins} check-in${campusMood.totalCheckins > 1 ? 's' : ''} today. Need 5+ to show campus mood.`
                : "You're one of the first to check in today!"}
            </Text>
          )}
          <Pressable
            style={styles.directionButton}
            onPress={() => router.replace('/(tabs)/map')}
          >
            <Text style={styles.directionText}>View campus map</Text>
          </Pressable>
        </View>

        {/* Done button */}
        <Pressable
          style={styles.doneButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMascot: {
    width: 100,
    height: 100,
    marginBottom: spacing.lg,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  streakCard: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  streakText: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  moodCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  moodImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  moodText: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  suggestionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  suggestionDesc: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  eventBadge: {
    backgroundColor: colors.moodBg.yellow,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  eventBadgeText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: '500',
  },
  evidenceText: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  miniMascot: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  directionButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  directionText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  campusMoodCard: {
    backgroundColor: colors.mint,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  campusMoodTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  campusMoodSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  moodBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  moodBarSegment: {
    height: '100%',
  },
  // Crisis cards
  crisisCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  crisisMascot: {
    width: 50,
    height: 50,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  crisisMessage: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  crisisSecondary: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  crisisResourceText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  crisisResourceButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  crisisResourceLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.text,
  },
  crisisResourceDetail: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  crisisActionButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  crisisActionText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  crisisDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  crisisOrText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  crisisDismiss: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  crisisDismissText: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },

  doneButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
});
