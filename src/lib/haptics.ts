/**
 * Haptic feedback for mobile web
 * Uses web-haptics (https://haptics.lochie.me/)
 * - Android: Vibration API (requires user gesture)
 * - iOS/Safari: Vibration API not supported; debug mode plays audio fallback in dev
 */
import { WebHaptics } from 'web-haptics';

const haptics = new WebHaptics({
  debug: import.meta.env.DEV, // Audio feedback in development (e.g. desktop, iOS)
});

function safeTrigger(
  pattern: Array<{ duration: number; delay?: number; intensity?: number }>,
  options?: { intensity?: number }
): void {
  try {
    haptics.trigger(pattern, options);
  } catch {
    // Ignore errors (e.g. unsupported device, permission)
  }
}

/**
 * Success haptic - two taps (e.g. when checking off a habit)
 */
export function triggerSuccess(): void {
  safeTrigger([
    { duration: 30 },
    { delay: 60, duration: 40, intensity: 1 },
  ]);
}

/**
 * Selection haptic - light tap (e.g. when selecting a tab)
 * Uses 15ms (not 8ms) - some devices need minimum duration to perceive
 */
export function triggerSelection(): void {
  safeTrigger([{ duration: 15 }], { intensity: 0.5 });
}

/**
 * Buzz haptic - 300ms vibration (e.g. when refreshing analytics)
 */
export function triggerBuzz(): void {
  safeTrigger([{ duration: 300 }], { intensity: 1 });
}
