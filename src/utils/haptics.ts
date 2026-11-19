/**
 * Cross-platform mobile haptics utility.
 *
 * - Android / Vibration API browsers: triggers tailored `navigator.vibrate(...)` patterns.
 * - iOS Safari 17.4+/18+: pre-mounts an in-viewport native `<input type="checkbox" switch>`
 *   linked to a `<label>` (WebKit skips Taptic haptics if the switch is off-screen,
 *   `opacity: 0`, or created on the same tick as `.click()`).
 * - Desktop / reduced-motion / SSR: safely no-ops.
 */

export type HapticStyle = 'light' | 'medium' | 'expand' | 'assemble' | 'dismiss';

const VIBRATION_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 18,
  medium: 32,
  expand: [24, 30, 38],
  assemble: [18, 28, 22, 28, 32],
  dismiss: 20,
};

const IOS_SWITCH_ID = 'portfolio-ios-haptic-switch';
let iosSwitchLabel: HTMLLabelElement | null = null;

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getOrCreateIosHapticTrigger(): HTMLLabelElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  if (iosSwitchLabel && document.body.contains(iosSwitchLabel)) {
    return iosSwitchLabel;
  }

  const existingInput = document.getElementById(IOS_SWITCH_ID);
  if (existingInput?.parentElement instanceof HTMLLabelElement) {
    iosSwitchLabel = existingInput.parentElement;
    return iosSwitchLabel;
  }

  // Keep inside viewport with near-zero (non-zero) opacity so iOS WebKit paints it
  // and fires genuine Taptic Engine feedback when toggled on user tap.
  const label = document.createElement('label');
  label.htmlFor = IOS_SWITCH_ID;
  label.setAttribute('aria-hidden', 'true');
  label.style.position = 'fixed';
  label.style.top = '0';
  label.style.left = '0';
  label.style.width = '2px';
  label.style.height = '2px';
  label.style.opacity = '0.001';
  label.style.overflow = 'hidden';
  label.style.zIndex = '-1';

  const input = document.createElement('input');
  input.id = IOS_SWITCH_ID;
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');

  label.appendChild(input);
  document.body.appendChild(label);
  iosSwitchLabel = label;
  return label;
}

/**
 * Call once on app mount so the iOS Taptic switch control is already laid out
 * before the user's first tap.
 */
export function initHaptics(): void {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  if (
    isTouchDevice() &&
    !(typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
  ) {
    getOrCreateIosHapticTrigger();
  }
}

export function triggerHaptic(style: HapticStyle = 'light'): boolean {
  if (typeof window === 'undefined' || prefersReducedMotion()) {
    return false;
  }

  // 1. Standard Vibration API (Android Chrome / Edge / Firefox)
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      const ok = navigator.vibrate(VIBRATION_PATTERNS[style]);
      if (ok) return true;
    } catch {
      // Fall through to iOS fallback
    }
  }

  // 2. iOS Safari Taptic Engine fallback via pre-mounted native switch control
  if (isTouchDevice()) {
    try {
      const trigger = getOrCreateIosHapticTrigger();
      if (trigger) {
        trigger.click();
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
