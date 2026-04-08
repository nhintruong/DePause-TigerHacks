import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { getStreak } from '../../src/lib/checkin';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [streak, setStreak] = useState(0);
  const [testSent, setTestSent] = useState('');

  useFocusEffect(
    useCallback(() => {
      getStreak().then(setStreak);
    }, [])
  );

  async function sendTestNotification(type: 'primary' | 'evening' | 'spoiled') {
    if (Platform.OS === 'web') {
      setTestSent('Notifications only work on a real device (Expo Go)');
      return;
    }

    const messages = {
      primary: {
        title: 'DePause',
        body: "Quick vibe check -- how's your day going?",
      },
      evening: {
        title: 'DePause',
        body: `You checked in as stressed earlier. How about now?`,
      },
      spoiled: {
        title: 'DePause',
        body: "DePause noticed you didn't check in today. The heatmap misses you.",
      },
    };

    const msg = messages[type];

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 3,
          repeats: false,
        },
      });
      setTestSent(`"${type}" notification will appear in 3 seconds`);
    } catch (e: any) {
      setTestSent(`Error: ${e.message}`);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || 'Not set'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Streak</Text>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>day{streak !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Account created</Text>
        <Text style={styles.value}>
          {user?.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : 'Unknown'}
        </Text>
      </View>

      {/* Test Notifications */}
      <View style={styles.card}>
        <Text style={styles.label}>Test Notifications</Text>
        <Text style={styles.testHint}>Minimize the app after tapping to see the notification</Text>

        <View style={styles.testRow}>
          <Pressable
            style={styles.testButton}
            onPress={() => sendTestNotification('primary')}
          >
            <Text style={styles.testButtonText}>Daily check-in</Text>
          </Pressable>

          <Pressable
            style={styles.testButton}
            onPress={() => sendTestNotification('evening')}
          >
            <Text style={styles.testButtonText}>Evening follow-up</Text>
          </Pressable>

          <Pressable
            style={[styles.testButton, { backgroundColor: colors.moodBg.red }]}
            onPress={() => sendTestNotification('spoiled')}
          >
            <Text style={styles.testButtonText}>Spoiled</Text>
          </Pressable>
        </View>

        {testSent ? <Text style={styles.testResult}>{testSent}</Text> : null}
      </View>

      <Pressable
        style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.8 }]}
        onPress={signOut}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
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
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: '600',
  },
  streakNumber: {
    fontSize: typography.sizes.hero,
    fontWeight: '800',
    color: colors.text,
  },
  streakLabel: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  testHint: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  testRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  testButton: {
    flex: 1,
    backgroundColor: colors.moodBg.green,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    color: colors.text,
  },
  testResult: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.error,
  },
});
