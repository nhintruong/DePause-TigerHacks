import { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, shadows } from '../src/constants/theme';
import { MOOD_QUADRANTS, SUB_EMOTION_LABELS, SUB_EMOTION_IMAGES, CONTEXT_OPTIONS, FOLLOWUP_PROMPTS } from '../src/constants/moods';
import { BUILDINGS } from '../src/data/buildings';
import { MoodQuadrant, SubEmotion, Context, Preference } from '../src/types';

type Step = 'mood' | 'building' | 'sub_emotion' | 'context' | 'preference';

export default function CheckInScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('mood');
  const [quadrant, setQuadrant] = useState<MoodQuadrant | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [subEmotion, setSubEmotion] = useState<SubEmotion | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [preference, setPreference] = useState<Preference | null>(null);
  const [buildingSearch, setBuildingSearch] = useState('');

  const handleMoodSelect = (mood: MoodQuadrant) => {
    setQuadrant(mood);
    setStep('building');
  };

  const handleBuildingSelect = (id: string | null) => {
    setBuildingId(id);
    if (quadrant === 'green' || quadrant === 'yellow') {
      navigateToResults();
    } else {
      setStep('sub_emotion');
    }
  };

  const handleSubEmotionSelect = (emotion: SubEmotion | null) => {
    setSubEmotion(emotion);
    setStep('context');
  };

  const handleContextSelect = (ctx: Context | null) => {
    setContext(ctx);
    setStep('preference');
  };

  const handlePreferenceSelect = (pref: Preference) => {
    setPreference(pref);
    navigateToResults();
  };

  const navigateToResults = () => {
    router.replace({
      pathname: '/results',
      params: {
        quadrant: quadrant!,
        building_id: buildingId || '',
        sub_emotion: subEmotion || '',
        context: context || '',
        preference: preference || '',
      },
    });
  };

  const filteredBuildings = BUILDINGS.filter((b) =>
    b.shortName.toLowerCase().includes(buildingSearch.toLowerCase()) ||
    b.name.toLowerCase().includes(buildingSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {['mood', 'building', 'sub_emotion', 'context', 'preference'].map((s, i) => {
          const steps: Step[] = ['mood', 'building', 'sub_emotion', 'context', 'preference'];
          const currentIndex = steps.indexOf(step);
          const isPositive = quadrant === 'green' || quadrant === 'yellow';
          const totalSteps = isPositive ? 2 : 5;
          if (!isPositive && i < totalSteps || isPositive && i < 2) {
            return (
              <View
                key={s}
                style={[
                  styles.dot,
                  i <= currentIndex && { backgroundColor: quadrant ? MOOD_QUADRANTS[quadrant].color : colors.primary },
                ]}
              />
            );
          }
          return null;
        })}
      </View>

      {/* Step: Mood Selection */}
      {step === 'mood' && (
        <View style={styles.stepContainer}>
          <Text style={styles.prompt}>How are you feeling?</Text>
          <View style={styles.moodGrid}>
            {(Object.keys(MOOD_QUADRANTS) as MoodQuadrant[]).map((key) => {
              const mood = MOOD_QUADRANTS[key];
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [
                    styles.moodCard,
                    { backgroundColor: mood.bgColor },
                    pressed && { transform: [{ scale: 0.95 }] },
                  ]}
                  onPress={() => handleMoodSelect(key)}
                >
                  <Image source={mood.image} style={styles.moodImage} resizeMode="contain" />
                  <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Step: Building Selection */}
      {step === 'building' && (
        <View style={styles.stepContainer}>
          <Text style={styles.prompt}>Where are you right now?</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search buildings..."
            placeholderTextColor={colors.textLight}
            value={buildingSearch}
            onChangeText={setBuildingSearch}
          />
          <ScrollView style={styles.buildingList} showsVerticalScrollIndicator={false}>
            {filteredBuildings.map((building) => (
              <Pressable
                key={building.id}
                style={({ pressed }) => [
                  styles.buildingRow,
                  pressed && { backgroundColor: colors.moodBg.green },
                ]}
                onPress={() => handleBuildingSelect(building.id)}
              >
                <Text style={styles.buildingName}>{building.shortName}</Text>
                <Text style={styles.buildingType}>{building.type}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.skipButton}
              onPress={() => handleBuildingSelect(null)}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Step: Sub-Emotion Selection (Red/Blue only) */}
      {step === 'sub_emotion' && quadrant && (
        <View style={styles.stepContainer}>
          <Text style={styles.prompt}>{FOLLOWUP_PROMPTS[quadrant].subEmotionPrompt}</Text>
          <View style={styles.emotionGrid}>
            {MOOD_QUADRANTS[quadrant].subEmotions.map((emotion) => (
              <Pressable
                key={emotion}
                style={({ pressed }) => [
                  styles.emotionCard,
                  { backgroundColor: MOOD_QUADRANTS[quadrant].bgColor },
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => handleSubEmotionSelect(emotion)}
              >
                <Image
                  source={SUB_EMOTION_IMAGES[emotion]}
                  style={styles.subEmotionImage}
                  resizeMode="contain"
                />
                <Text style={styles.emotionLabel}>{SUB_EMOTION_LABELS[emotion]}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.skipButton} onPress={() => handleSubEmotionSelect(null)}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Step: Context */}
      {step === 'context' && quadrant && (
        <View style={styles.stepContainer}>
          <Text style={styles.prompt}>{FOLLOWUP_PROMPTS[quadrant].contextPrompt}</Text>
          <View style={styles.contextGrid}>
            {CONTEXT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  styles.contextCard,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => handleContextSelect(opt.key)}
              >
                <Text style={styles.contextLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.skipButton} onPress={() => handleContextSelect(null)}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Step: Preference */}
      {step === 'preference' && (
        <View style={styles.stepContainer}>
          <Text style={styles.prompt}>Would you rather...</Text>
          <View style={styles.prefGrid}>
            {([
              { key: 'people' as Preference, label: 'Be around people' },
              { key: 'quiet' as Preference, label: 'Have some quiet time' },
              { key: 'either' as Preference, label: 'Either works' },
            ]).map((opt) => (
              <Pressable
                key={opt.key}
                style={({ pressed }) => [
                  styles.prefCard,
                  pressed && { transform: [{ scale: 0.95 }] },
                ]}
                onPress={() => handlePreferenceSelect(opt.key)}
              >
                <Text style={styles.prefLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  stepContainer: {
    flex: 1,
  },
  prompt: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Mood grid
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  moodCard: {
    width: '44%',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  moodImage: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.lg,
    resizeMode: 'contain',
  },
  moodLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    marginTop: spacing.sm,
  },

  // Building list
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buildingList: {
    flex: 1,
  },
  buildingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  buildingName: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  buildingType: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },

  // Sub-emotion grid
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emotionCard: {
    width: '30%',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...shadows.soft,
  },
  subEmotionImage: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.md,
    resizeMode: 'contain',
  },
  emotionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },

  // Context grid
  contextGrid: {
    gap: spacing.md,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.soft,
  },
  contextLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.text,
  },

  // Preference
  prefGrid: {
    gap: spacing.md,
  },
  prefCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.soft,
  },
  prefLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.text,
  },

  // Skip
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  skipText: {
    fontSize: typography.sizes.md,
    color: colors.textLight,
    fontWeight: '500',
  },
});
