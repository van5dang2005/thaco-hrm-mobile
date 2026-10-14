import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/shared/ui/Card';

import { TodoTiles } from '../TodoTiles';
import { type LayoutProps, ModuleGrid, SectionHeader } from './shared';

/** "Lưới" (2c, default): "Cần xử lý" tiles, then every service in a white 4-column card ending with "+ Thêm". */
export function GridLayout({ modules, signals, onOpen, showTodo, onCustomize }: LayoutProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-4">
      {showTodo ? <TodoTiles modules={modules} onOpen={onOpen} /> : null}
      <View className="gap-2.5">
        <SectionHeader testID="home-customize" title={t('home.utilities')} action={t('home.customize')} onAction={onCustomize} />
        <Card className="overflow-visible px-2 py-4">
          <ModuleGrid modules={modules} signals={signals} onOpen={onOpen} onAdd={onCustomize} />
        </Card>
      </View>
    </View>
  );
}
