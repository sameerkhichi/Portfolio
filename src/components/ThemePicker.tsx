import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import {
  ACCENT_THEMES,
  type AccentThemeId,
} from '../data/themes';
import { nanotechAudio } from '../utils/nanotechAudio';
import { triggerHaptic } from '../utils/haptics';

interface ThemePickerProps {
  open: boolean;
  activeThemeId: AccentThemeId;
  align?: 'left' | 'right';
  onSelect: (id: AccentThemeId) => void;
  onClose: () => void;
}

export function ThemePicker({
  open,
  activeThemeId,
  align = 'left',
  onSelect,
  onClose,
}: ThemePickerProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        !target?.closest('[data-theme-trigger="true"]')
      ) {
        onClose();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('pointerdown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      className={`theme-popover is-align-${align}`}
      role="menu"
      aria-label="Choose accent color theme"
    >
      <div className="theme-popover-title">Accent Theme</div>
      <div className="theme-options-list">
        {ACCENT_THEMES.map((theme) => {
          const isActive = theme.id === activeThemeId;
          return (
            <button
              key={theme.id}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              className={`theme-option-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                nanotechAudio.unlock();
                nanotechAudio.playNodeFocus();
                onSelect(theme.id);
                onClose();
              }}
            >
              <span
                className="theme-swatch-dot"
                style={{
                  backgroundColor: theme.swatch,
                  boxShadow: `0 0 10px ${theme.swatch}`,
                }}
              />
              <span className="theme-option-name">{theme.name}</span>
              {isActive && <Check size={14} className="theme-option-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
