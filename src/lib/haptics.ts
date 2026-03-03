/**
 * Haptic feedback for mobile web
 * Uses web-haptics (https://haptics.lochie.me/) - no-op on unsupported devices
 */
import { WebHaptics } from 'web-haptics';

const haptics = new WebHaptics();

/**
 * Success haptic - two taps (e.g. when checking off a habit)
 */
export function triggerSuccess(): void {
  if (!WebHaptics.isSupported) return;
  haptics.trigger([
    { duration: 30 },
    { delay: 60, duration: 40, intensity: 1 },
  ]);
}

/**
 * Selection haptic - light tap (e.g. when selecting a tab)
 */
export function triggerSelection(): void {
  if (!WebHaptics.isSupported) return;
  haptics.trigger([{ duration: 8 }], { intensity: 0.3 });
}

/**
 * Buzz haptic - 300ms vibration (e.g. when refreshing analytics)
 */
export function triggerBuzz(): void {
  if (!WebHaptics.isSupported) return;
  haptics.trigger([{ duration: 300 }], { intensity: 1 });
}
