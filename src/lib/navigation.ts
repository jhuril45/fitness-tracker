import { router, type Href } from 'expo-router';

/**
 * Goes back a screen, or to `fallback` when there's nothing to go back to,
 * e.g. on the web after a page was opened by its URL or refreshed.
 */
export function goBack(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
