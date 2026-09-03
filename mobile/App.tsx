import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { AppStoreProvider } from '@saanpaw/shared';
import { AuthProvider } from '@/context/AuthContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { theme } from '@/constants/theme';

export default function App() {
  const [fontsReady] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  // Text would flash in the system font and reflow once the real fonts land.
  if (!fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <AuthProvider>
          {/* Screens like the role picker and the two dashboards hide their header and
              set no title, so the default formatter falls through to "undefined" in the
              browser tab. Fall back to the brand name instead. */}
          <NavigationContainer documentTitle={{ formatter: (options) => options?.title ?? 'SaanPaw' }}>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </AppStoreProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
