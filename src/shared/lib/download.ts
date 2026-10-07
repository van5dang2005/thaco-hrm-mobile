import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Downloads an authenticated file into the cache and opens the system share / preview sheet. */
export async function downloadAndShare(url: string, fileName: string, headers: Record<string, string>) {
  const safeName = fileName.replace(/[^\w.\-() ]+/g, '_') || 'tai-lieu';
  const destination = new File(Paths.cache, safeName);
  const file = await File.downloadFileAsync(url, destination, { headers, idempotent: true });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { dialogTitle: fileName });
  return file.uri;
}
