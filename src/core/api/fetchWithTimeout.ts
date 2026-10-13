/** fetch with a deadline; a caller's `external` signal cancels it too. AbortError on either. */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, external?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const forward = () => controller.abort();
  external?.addEventListener('abort', forward);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    external?.removeEventListener('abort', forward);
  }
}
