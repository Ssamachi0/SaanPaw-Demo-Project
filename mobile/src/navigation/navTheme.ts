import { theme } from '@/constants/theme';

/** One header style, so both module navigators look like the same app. */
export const headerStyle = {
  headerStyle: { backgroundColor: theme.colors.surface },
  headerTintColor: theme.colors.text,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 16 },
  headerShadowVisible: false,
};
