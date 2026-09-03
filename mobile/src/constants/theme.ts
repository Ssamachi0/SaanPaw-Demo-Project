import type { TextStyle } from 'react-native';
import { colors, radius, spacing } from '@saanpaw/shared';

/**
 * The shared tokens, plus the two things that cannot be shared: fonts and
 * shadows. RN needs shadowOffset/elevation, the web needs box-shadow.
 */

/**
 * Fredoka is rounded and warm, so it carries the brand and the big numbers.
 * Nunito is the workhorse - friendly but still readable at 12px.
 * Names must match the @expo-google-fonts exports exactly.
 */
export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extra: 'Nunito_800ExtraBold',
} as const;

/** One place for text sizes, so headings and captions stay consistent. */
export const type = {
  hero: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 34 },
  h1: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28 },
  h2: { fontFamily: fonts.display, fontSize: 17, lineHeight: 23 },
  h3: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  stat: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 30 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  captionMedium: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  tiny: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15 },
} satisfies Record<string, TextStyle>;

export const theme = {
  colors,
  spacing,
  radius,
  fonts,
  type,
  shadow: {
    card: {
      shadowColor: '#3C2E14',
      shadowOpacity: 0.07,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    raised: {
      shadowColor: '#3C2E14',
      shadowOpacity: 0.16,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 7,
    },
  },
} as const;

export { reportKindStyle } from '@saanpaw/shared';
