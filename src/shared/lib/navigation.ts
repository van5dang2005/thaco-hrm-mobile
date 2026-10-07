import { router, type Href } from 'expo-router';

/** Back when there is somewhere to go back to (not after opening a deep link directly), else `fallback`. */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
