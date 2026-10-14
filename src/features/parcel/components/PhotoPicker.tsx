import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Icon } from '@/shared/ui/Icon';
import { type AppIcon, CameraIcon, ImagePlusIcon, XIcon } from '@/shared/ui/icons';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';

import { resolveParcelFileUrl, type UploadFile } from '../api/parcel.api';
import type { ParcelAttachment } from '../types';
import { MAX_PARCEL_FILE_BYTES, MAX_PARCEL_FILES } from '../utils/parcel';

type Props = {
  /** Attachments already on the server (edit), kept unless removed. */
  kept: ParcelAttachment[];
  onRemoveKept: (id: string) => void;
  files: UploadFile[];
  onChangeFiles: (files: UploadFile[]) => void;
  disabled?: boolean;
};

const QUALITY = 0.6;
const TILE = 76;

function sizeOf(asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileSize) return asset.fileSize;
  try {
    return new File(asset.uri).size;
  } catch {
    return 0;
  }
}

/**
 * Parcel photos as a row of tiles: thumbnails, then "Chụp ảnh" / "Thư viện" tiles while there is room.
 * At most 5 in total, each ≤ 5MB (LIMIT_5_ATTACHMENTS / EXCEED_5MB_LIMIT). The caller shows the title and count.
 */
export function PhotoPicker({ kept, onRemoveKept, files, onChangeFiles, disabled }: Props) {
  const { t } = useTranslation();
  const count = kept.length + files.length;
  const slots = MAX_PARCEL_FILES - count;

  const accept = (assets: ImagePicker.ImagePickerAsset[]) => {
    const ok = assets.filter((asset) => {
      const name = asset.fileName ?? 'photo.jpg';
      if (sizeOf(asset) > MAX_PARCEL_FILE_BYTES) {
        toast.error(t('reception.photoTooLarge', { name }));
        return false;
      }
      return true;
    });
    if (ok.length > slots) toast.error(t('reception.photoLimit'));
    const stamp = Date.now();
    onChangeFiles([
      ...files,
      ...ok.slice(0, Math.max(0, slots)).map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `parcel-${stamp}-${index}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
        size: sizeOf(asset),
      })),
    ]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return toast.error(t('reception.cameraDenied'));
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: QUALITY });
    if (!result.canceled) accept(result.assets);
  };

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return toast.error(t('reception.libraryDenied'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: QUALITY, allowsMultipleSelection: true, selectionLimit: slots });
    if (!result.canceled) accept(result.assets);
  };

  const thumbs = [
    ...kept.map((a) => ({ key: a.id, uri: resolveParcelFileUrl(a.filePath), onRemove: () => onRemoveKept(a.id) })),
    ...files.map((f, index) => ({ key: f.uri, uri: f.uri, onRemove: () => onChangeFiles(files.filter((_, i) => i !== index)) })),
  ];
  const canAdd = slots > 0 && !disabled;

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {thumbs.map((thumb) => (
        <View key={thumb.key}>
          <Image source={{ uri: thumb.uri }} style={{ width: TILE, height: TILE, borderRadius: 14 }} contentFit="cover" />
          {!disabled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('reception.removePhoto')}
              onPress={thumb.onRemove}
              hitSlop={8}
              className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-inverse"
            >
              <Icon icon={XIcon} size={13} weight="bold" color="on-inverse" />
            </Pressable>
          ) : null}
        </View>
      ))}
      {canAdd ? (
        <>
          <AddTile testID="parcel-form-camera" icon={CameraIcon} label={t('reception.takePhoto')} onPress={() => void takePhoto()} />
          <AddTile testID="parcel-form-library" icon={ImagePlusIcon} label={t('reception.pickPhoto')} onPress={() => void pickPhotos()} />
        </>
      ) : null}
    </View>
  );
}

/** Dashed square that adds photos, the same size as a thumbnail. */
function AddTile({ icon, label, onPress, testID }: { icon: AppIcon; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-line-strong bg-panel active:opacity-70"
      style={{ width: TILE, height: TILE }}
    >
      <Icon icon={icon} size={20} color="primary" />
      <Text weight="semibold" numberOfLines={1} className="text-primary" style={{ fontSize: 11, lineHeight: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}
