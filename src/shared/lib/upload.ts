import { File } from 'expo-file-system';

/** A file on the device (camera, photo library, document picker) waiting to be uploaded. */
export type LocalFile = { uri: string; name: string; type: string; size?: number };

/**
 * Appends a local file to a multipart form.
 *
 * Expo installs `expo/fetch` as the global fetch, and it does not accept React Native's
 * `{ uri, name, type }` parts. It does accept any part exposing `bytes()`, and reads the
 * filename and content type from `name` / `type`, so the file is read through expo-file-system.
 */
export function appendLocalFile(form: FormData, key: string, file: LocalFile) {
  const part = { name: file.name, type: file.type, bytes: () => new File(file.uri).bytes() };
  form.append(key, part as unknown as Blob);
}
