import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Spacing } from '../../src/constants/spacing';
import { register } from '../../src/lib/authService';
import type { AuthUser } from '../../src/stores/authStore';

const schema = z.object({
  displayName: z.string().min(1, 'Name is required').max(80),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'teacher', 'both', 'parent']),
});

type FormValues = z.infer<typeof schema>;

const ROLES: { value: AuthUser['role']; label: string; description: string }[] = [
  { value: 'student', label: 'Student', description: 'I am memorising the Quran' },
  { value: 'teacher', label: 'Teacher', description: 'I oversee students or a halaqa' },
  { value: 'both', label: 'Both', description: 'I memorise and I teach' },
  { value: 'parent', label: 'Parent', description: "I follow my child's progress" },
];

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      role: 'student',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await register(values.email, values.password, values.displayName, values.role);
      router.replace('/(onboarding)/set-goal');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ?? 'Something went wrong. Please try again.';
      setServerError(msg);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      <SafeAreaView edges={['top']} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <Text variant="body" color={theme.accentGreenLight}>
                ← Back
              </Text>
            </TouchableOpacity>
            <Text variant="h1" style={styles.headline}>
              Create your account.
            </Text>
            <Text variant="body" secondary>
              Your journey begins here.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Your name"
                  placeholder="Ahmad"
                  textContentType="name"
                  autoComplete="name"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.displayName?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Min. 8 characters"
                  secureTextEntry
                  secureToggle
                  textContentType="newPassword"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            {/* Role selector */}
            <View style={styles.roleSection}>
              <Text variant="caption" secondary style={{ letterSpacing: 0.5 }}>
                I AM A
              </Text>
              <View style={styles.roleGrid}>
                {ROLES.map((r) => {
                  const active = selectedRole === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => setValue('role', r.value)}
                      activeOpacity={0.8}
                      style={styles.roleTile}
                    >
                      <Card
                        elevated={active}
                        style={{
                          borderColor: active
                            ? theme.accentGreenLight
                            : theme.border,
                          borderWidth: active ? 1.5 : 1,
                        }}
                      >
                        <Text variant="body" semiBold>
                          {r.label}
                        </Text>
                        <Text variant="caption" secondary style={{ marginTop: 2 }}>
                          {r.description}
                        </Text>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.role && (
                <Text variant="caption" color={theme.error}>
                  {errors.role.message}
                </Text>
              )}
            </View>

            {serverError && (
              <Text variant="caption" color={theme.error}>
                {serverError}
              </Text>
            )}

            <Button
              label="Create Account"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="body" secondary>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text variant="body" color={theme.accentGreenLight}>
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SafeAreaView edges={['bottom']} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing['2xl'],
  },
  header: { gap: Spacing.sm },
  back: { marginBottom: Spacing.xs },
  headline: { marginTop: Spacing.xs },
  form: { gap: Spacing.md },
  roleSection: { gap: Spacing.sm },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleTile: {
    width: '47%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
  },
});
