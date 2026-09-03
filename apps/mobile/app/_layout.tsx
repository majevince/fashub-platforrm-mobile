import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Fraunces_600SemiBold, Fraunces_600SemiBold_Italic } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { View } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { ThemeProvider } from '../theme/ThemeProvider';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors } from '@fashub/design-tokens';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

SplashScreen.preventAutoHideAsync();

function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const ready = fontsReady && !authLoading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[userId]" />
        <Stack.Screen name="notifications" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <ThemeProvider>
        <AuthProvider>
          <View style={{ flex: 1, backgroundColor: colors.ivory }}>
            <AppShell fontsReady={fontsLoaded || !!fontError} />
          </View>
        </AuthProvider>
      </ThemeProvider>
    </StripeProvider>
  );
}
