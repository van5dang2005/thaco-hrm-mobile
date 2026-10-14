/** A file on the device (camera, photo library, document picker) waiting to be uploaded. */
export type LocalFile = { uri: string; name: string; type: string; size?: number };

/** Characters `encodeURIComponent` leaves as they are, besides letters and digits. */
const toAscii = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9.()-]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * The filename the server will store. React Native percent-encodes the multipart filename and the
 * ASP.NET back-ends keep it as sent ("T%C3%A0i%20li%E1%BB%87u.pdf"), so the name is reduced to
 * characters that need no encoding: "Tài liệu họp.pdf" → "Tai_lieu_hop.pdf".
 */
export function uploadFileName(name: string) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  return `${toAscii(base) || 'file'}${toAscii(ext)}`;
}

/**
 * Appends a local file to a multipart form as React Native's `{ uri, name, type }` part.
 *
 * The global fetch is React Native's (Expo SDK 55 does not replace it with `expo/fetch`), and its
 * native networking reads a file part from `uri` only. Any other object part goes out as an empty
 * file on iOS, which both back-ends drop without an error, and fails with "Unrecognized FormData part"
 * on Android.
 */
export function appendLocalFile(form: FormData, key: string, file: LocalFile) {
  form.append(key, { uri: file.uri, name: uploadFileName(file.name), type: file.type || 'application/octet-stream' } as unknown as Blob);
}
