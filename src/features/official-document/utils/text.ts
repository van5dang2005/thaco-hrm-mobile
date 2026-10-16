/** "A", "A và B", "A, B và C": `and` is the locale's conjunction. */
export function joinNames(names: readonly string[], and: string) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

/** Splits a translated sentence on `**` markers into plain / bold runs ("quay về **{{name}}** để…"). */
export function boldRuns(text: string): { text: string; bold: boolean }[] {
  return text
    .split('**')
    .map((part, index) => ({ text: part, bold: index % 2 === 1 }))
    .filter((run) => run.text.length > 0);
}

/** Lower case without Vietnamese diacritics ("Hoàng Gia Bảo" → "hoang gia bao"), so searches match unaccented typing. */
export function foldVi(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Whether any of `fields` contains `query`, ignoring case and diacritics; an empty query matches. */
export function matchesQuery(query: string, ...fields: (string | undefined | null)[]) {
  const q = foldVi(query.trim());
  return !q || fields.some((field) => !!field && foldVi(field).includes(q));
}
