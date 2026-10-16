import { useTheme } from '@/core/theme/ThemeProvider';

import type { TaskTone } from '../utils/tasks';

/** Calendar colors of "Việc của tôi": chủ trì red, phối hợp blue, để biết grey, hoàn thành green. */
export function useTaskToneColors(): Record<TaskTone, string> {
  const { colors } = useTheme();
  return { chu_tri: colors.danger, phoi_hop: colors.primary, de_biet: colors.subtle, done: colors.success };
}
