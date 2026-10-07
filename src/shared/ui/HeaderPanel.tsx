import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { cn } from '@/shared/lib/cn';

import { onBlue } from './ScreenShell';

/** White-12% block on the blue header (countdown, deadline bar, original receiver). Radius 18, padding 14/16. */
export function HeaderPanel({ children, className, style, testID }: { children: ReactNode; className?: string; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View testID={testID} className={cn('mx-1 mt-4 rounded-[18px] px-4 py-3.5', className)} style={[{ backgroundColor: onBlue(0.12) }, style]}>
      {children}
    </View>
  );
}
