import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasSeenOnboarding = useAuthStore((s) => s.hasSeenOnboarding);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/exams" />;
  }
  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)/welcome" />;
  }
  return <Redirect href="/(auth)/login" />;
}
