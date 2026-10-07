import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/shared/ui/Icon';
import { XIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';

import { resolveParcelFileUrl } from '../api';
import type { ParcelAttachment } from '../types';

/** 64×64 thumbnails (design 6e) with a full-screen pager. */
export function PhotoStrip({ attachments }: { attachments: ParcelAttachment[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!attachments.length) return null;
  return (
    <>
      <View className="flex-row flex-wrap gap-2">
        {attachments.map((a, index) => (
          <Pressable key={a.id} accessibilityRole="imagebutton" accessibilityLabel={a.fileName} onPress={() => setOpenIndex(index)} className="active:opacity-80">
            <Image source={{ uri: resolveParcelFileUrl(a.filePath) }} style={{ width: 64, height: 64, borderRadius: 12 }} contentFit="cover" transition={150} />
          </Pressable>
        ))}
      </View>
      <Modal visible={openIndex !== null} transparent animationType="fade" onRequestClose={() => setOpenIndex(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (openIndex ?? 0) * width, y: 0 }}>
            {attachments.map((a) => (
              <View key={a.id} style={{ width, height }} className="items-center justify-center">
                <Image source={{ uri: resolveParcelFileUrl(a.filePath) }} style={{ width, height: height * 0.75 }} contentFit="contain" />
                <Text className="mt-3 text-sub text-white">{a.fileName}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="close"
            onPress={() => setOpenIndex(null)}
            style={{ position: 'absolute', top: insets.top + 12, right: 16 }}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
          >
            <Icon icon={XIcon} size={22} rawColor="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
