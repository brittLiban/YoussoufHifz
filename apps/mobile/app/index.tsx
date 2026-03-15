import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const ONBOARDING_KEY = 'youssouf_onboarded';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setHasOnboarded(val === 'true');
    });
  }, []);

  // Wait until we know onboarding status
  if (hasOnboarded === null) return null;

  if (isAuthenticated) return <Redirect href="/(tabs)/home" />;
  if (!hasOnboarded) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(auth)/login" />;
}
