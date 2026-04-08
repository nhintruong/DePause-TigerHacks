import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, shadows } from '../src/constants/theme';
import { mascotImages } from '../src/constants/images';
import { Image } from 'react-native';

export default function TalkScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!phone.trim()) {
      Alert.alert('Phone number', 'Please enter your phone number so someone can reach you.');
      return;
    }
    // In a real app, this would send to a secure endpoint or email to counseling services.
    // For the hackathon, we show a confirmation.
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>

        <Image source={mascotImages.hug} style={styles.mascot} resizeMode="contain" />

        {!submitted ? (
          <>
            <Text style={styles.title}>We're glad you're reaching out.</Text>
            <Text style={styles.subtitle}>
              Fill in your info below and someone from DePauw Counseling Services will reach out to you.
            </Text>

            {/* Form */}
            <View style={styles.form}>
              <Text style={styles.label}>Your phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="(765) 555-1234"
                placeholderTextColor={colors.textLight}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />

              <Text style={styles.label}>Best time to call (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Weekday afternoons, after 3 PM"
                placeholderTextColor={colors.textLight}
                value={preferredTime}
                onChangeText={setPreferredTime}
              />

              <Pressable style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitText}>Send my info to Counseling Services</Text>
              </Pressable>

              <Text style={styles.privacyNote}>
                Your info will only be shared with DePauw Counseling Services. Nothing else.
              </Text>
            </View>

            <View style={styles.divider} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Someone will reach out.</Text>
            <Text style={styles.subtitle}>
              DePauw Counseling Services will contact you at the number you provided. You can also walk in anytime: 11AM-12PM or 3-4PM.
            </Text>

            <View style={styles.divider} />
          </>
        )}

        {/* Always show direct resources */}
        <Text style={styles.sectionTitle}>Or reach out directly</Text>

        <Pressable
          style={styles.resourceCard}
          onPress={() => Linking.openURL('tel:7656584268')}
        >
          <Text style={styles.resourceLabel}>DePauw Counseling Services</Text>
          <Text style={styles.resourceDetail}>Call (765) 658-4268</Text>
          <Text style={styles.resourceDetail}>Walk-in: 11AM-12PM, 3-4PM (weekdays)</Text>
          <Text style={styles.resourceDetail}>24/7 crisis support after hours</Text>
        </Pressable>

        <Pressable
          style={styles.resourceCard}
          onPress={() => Linking.openURL('tel:988')}
        >
          <Text style={styles.resourceLabel}>988 Suicide and Crisis Lifeline</Text>
          <Text style={styles.resourceDetail}>Call or text 988, 24/7</Text>
        </Pressable>

        <Pressable
          style={styles.resourceCard}
          onPress={() => Linking.openURL('sms:741741&body=HOME')}
        >
          <Text style={styles.resourceLabel}>Crisis Text Line</Text>
          <Text style={styles.resourceDetail}>Text HOME to 741741, 24/7, free</Text>
        </Pressable>

        <Pressable
          style={styles.resourceCard}
          onPress={() => Linking.openURL('tel:18664887386')}
        >
          <Text style={styles.resourceLabel}>Trevor Project (LGBTQ+)</Text>
          <Text style={styles.resourceDetail}>Call 1-866-488-7386 or text START to 678-678</Text>
        </Pressable>

        <Pressable
          style={styles.resourceCard}
          onPress={() => Linking.openURL('tel:18005037234')}
        >
          <Text style={styles.resourceLabel}>Steve Fund (Students of Color)</Text>
          <Text style={styles.resourceDetail}>Call 1-800-503-7234</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          DePause is not a substitute for professional help. If you or someone you know is in immediate danger, call 911.
        </Text>
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
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
  },
  closeText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  mascot: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  form: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  privacyNote: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  resourceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  resourceLabel: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  resourceDetail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 16,
  },
});
