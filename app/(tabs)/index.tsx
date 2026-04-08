import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { mascotImages } from '../../src/constants/images';
import { getStreak } from '../../src/lib/checkin';
import { getCampusMood } from '../../src/lib/campusMood';

export default function HomeScreen() {
  const router = useRouter();
  const [streak, setStreak] = useState(0);
  const [todayCheckins, setTodayCheckins] = useState(0);

  // Refresh data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [s, mood] = await Promise.allSettled([getStreak(), getCampusMood()]);
        if (s.status === 'fulfilled') setStreak(s.value);
        if (mood.status === 'fulfilled') setTodayCheckins(mood.value.totalCheckins);
      }
      load();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DePause</Text>
        <Text style={styles.subtitle}>Feel the campus pulse</Text>
      </View>

      <View style={styles.mascotContainer}>
        <Image source={mascotImages.wave} style={styles.mascot} resizeMode="contain" />
      </View>

      <Pressable
        style={({ pressed }) => [styles.checkinButton, pressed && styles.checkinButtonPressed]}
        onPress={() => router.push('/checkin')}
      >
        <Text style={styles.checkinButtonText}>How are you feeling?</Text>
        <Text style={styles.checkinButtonSub}>Tap to check in</Text>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{streak}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{todayCheckins}</Text>
          <Text style={styles.statLabel}>check-ins today</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.hero,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  mascotContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  mascot: {
    width: 160,
    height: 160,
  },
  checkinButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    ...shadows.medium,
  },
  checkinButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  checkinButtonText: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  checkinButtonSub: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.soft,
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
