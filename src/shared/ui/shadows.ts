import type { ViewStyle } from 'react-native';

/** Shadows of the v3 design. Dark mode keeps them; cards there also get a hairline border. */
export const shadows = {
  /** Cards and floating cards over the header. */
  card: { boxShadow: '0px 1px 2px rgba(15, 27, 45, 0.04), 0px 8px 24px rgba(15, 27, 45, 0.08)' },
  /** Primary (blue) buttons. */
  primary: { boxShadow: '0px 8px 18px rgba(0, 83, 155, 0.30)' },
  /** Success (green) buttons. */
  success: { boxShadow: '0px 8px 18px rgba(22, 134, 90, 0.28)' },
  /** Sticky action bar at the bottom of a screen. */
  footer: { boxShadow: '0px -8px 24px rgba(15, 27, 45, 0.07)' },
  /** Tab bar. */
  tabbar: { boxShadow: '0px -6px 20px rgba(15, 27, 45, 0.06)' },
  /** Selected segment / chip on a track. */
  raised: { boxShadow: '0px 1px 3px rgba(15, 27, 45, 0.14)' },
  /** Small round buttons on light backgrounds (home bell). */
  soft: { boxShadow: '0px 2px 8px rgba(15, 27, 45, 0.08)' },
} satisfies Record<string, ViewStyle>;
