import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { Card } from '@/shared/ui/Card';

import { TodoTiles } from '../TodoTiles';
import { CardGlow, type LayoutProps, ModuleGrid, SectionHeader, useHomeCardEdge } from './shared';

/** "Lưới" (2c, default): "Cần xử lý" tiles, then every service in a white 4-column card ending with "+ Thêm". */
export function GridLayout({ modules, signals, onOpen, showTodo, onCustomize }: LayoutProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const edge = useHomeCardEdge();
  return (
    <View className="gap-4">
      {showTodo ? <TodoTiles modules={modules} onOpen={onOpen} /> : null}
      <View className="gap-2.5">
        <SectionHeader testID="home-customize" title={t('home.utilities')} action={t('home.customize')} onAction={onCustomize} />
        <Card className="overflow-visible px-2 py-4" style={edge}>
          <CardGlow color={colors.primary} />
          <ModuleGrid modules={modules} signals={signals} onOpen={onOpen} onAdd={onCustomize} />
        </Card>
      </View>
    </View>
  );
}
