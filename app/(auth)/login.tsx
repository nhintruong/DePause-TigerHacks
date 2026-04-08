import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { mascotImages } from '../../src/constants/images';
import { supabase } from '../../src/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleAuth() {
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      console.log('Attempting signup with:', email.trim());
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      console.log('Signup result:', { data, error });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        // Create profile manually (trigger was removed)
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email.trim(),
        });
        console.log('Profile creation:', profileError || 'success');

        if (!data.session) {
          // No session = try signing in directly
          console.log('No session after signup, trying sign in...');
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (signInError) {
            setErrorMsg(signInError.message);
          } else {
            setSuccessMsg('Signed in!');
          }
        } else {
          setSuccessMsg('Account created!');
        }
      }
    } else {
      console.log('Attempting signin with:', email.trim());
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      console.log('Signin result:', { data, error });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Signed in!');
      }
    }

    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <Image source={mascotImages.wave} style={styles.mascot} resizeMode="contain" />

        <Text style={styles.title}>DePause</Text>
        <Text style={styles.subtitle}>Feel the campus pulse</Text>

        <View style={styles.form}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@depauw.edu"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Pressable
            style={[styles.authButton, loading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.authButtonText}>
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => { setIsSignUp(!isSignUp); setErrorMsg(''); setSuccessMsg(''); }}
          >
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  mascot: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.hero,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  errorBox: {
    backgroundColor: '#FFE0E0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#CC0000',
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  successBox: {
    backgroundColor: '#D4F5DC',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    color: '#006600',
    fontSize: typography.sizes.sm,
    fontWeight: '500',
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
  authButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadows.soft,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  switchText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
});
