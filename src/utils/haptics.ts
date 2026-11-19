/**
 * Cross-platform mobile haptics utility.
 *
 * - Android / Vibration API browsers: triggers tailored `navigator.vibrate(...)` patterns.
 * - iOS Safari 17.4+/18+: triggers genuine Taptic Engine feedback via a hidden native
 *   `<input type="checkbox" switch>` control toggled synchronously inside user gestures.
 * - Desktop / reduced-motion / SSR: safely no-ops.
 */

export type HapticStyle = 'light' | 'medium' | 'expand' | 'assemble' | 'dismiss';

const VIBRATION_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 18,
  expand: [14, 24, 22],
  assemble: [10, 22, 12, 22, 16],
  dismiss: 12,
};

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

  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.position = 'fixed';
  label.style.left = '-9999px';
  label.style.top = '-9999px';
  label.style.width = '1px';
  label.style.height = '1px';
  label.style.opacity = '0';
  label.style.pointerEvents = 'none';
  label.style.overflow = 'hidden';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');

  label.appendChild(input);
  document.body.appendChild(label);
  iosSwitchLabel = label;
  return label;
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

  // 2. iOS Safari Taptic Engine fallback via native HTML switch control
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
