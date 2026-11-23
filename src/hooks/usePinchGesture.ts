import { useEffect, useRef } from 'react';
import type { ViewMode } from '../types/portfolio';

interface UsePinchGestureOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  viewMode: ViewMode;
  onPinchOutFromAbout: () => void;
  onPinchOutFromCatalog: () => void;
  onAboutPinchProgress?: (progress: number) => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (factor: number, clientX: number, clientY: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
  onPointerMoveScreen?: (clientX: number, clientY: number) => void;
}

/**
 * Cross-device spatial gesture controller.
 *
 * - Touchscreen 2-finger pinch-in (zoom out) from ABOUT_FULLSCREEN -> triggers Project Library zoom-out
 * - Laptop trackpad pinch (`wheel` with `ctrlKey === true`) -> smooth zoom / mode transitions
 * - Desktop wheel zoom & pointer drag-to-pan in NETWORK / NODE_PREVIEW
 * - Pinch-out in PROJECT_FULLSCREEN -> returns cleanly to neural network
 */
export function usePinchGesture({
  containerRef,
  viewMode,
  onPinchOutFromAbout,
  onPinchOutFromCatalog,
  onAboutPinchProgress,
  onPan,
  onZoom,
  onDraggingChange,
  onPointerMoveScreen,
}: UsePinchGestureOptions) {
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const prevPinchDistRef = useRef<number | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const draggingPointerIdRef = useRef<number | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);
  const wheelPinchAccumRef = useRef<number>(0);
  const wheelResetTimerRef = useRef<number | null>(null);
  const triggeredGestureRef = useRef<boolean>(false);
  const touchPinchActiveRef = useRef<boolean>(false);
  const touchInitialDistRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resetAboutPinchVisual = () => {
      wheelPinchAccumRef.current = 0;
      onAboutPinchProgress?.(0);
    };

    const normalizeWheelDeltaY = (e: WheelEvent): number => {
      if (e.deltaMode === 1) return e.deltaY * 38; // DOM_DELTA_LINE (Firefox / Windows mouse wheel)
      if (e.deltaMode === 2) return e.deltaY * 420; // DOM_DELTA_PAGE
      return e.deltaY; // DOM_DELTA_PIXEL
    };

    const handleWheel = (e: WheelEvent) => {
      const normalizedDeltaY = normalizeWheelDeltaY(e);

      // Allow normal vertical scroll inside full-screen catalog unless pinching (ctrlKey)
      if (viewMode === 'PROJECT_FULLSCREEN') {
        if (e.ctrlKey) {
          e.preventDefault();
          if (normalizedDeltaY > 18) {
            onPinchOutFromCatalog();
          }
        }
        return;
      }

      // In About Me landing: trackpad pinch-out ALWAYS zooms out; normal wheel lets user scroll
      // down to read the bio first, then zooms out once at the bottom (or when no scroll is needed).
      if (viewMode === 'ABOUT_FULLSCREEN') {
        if (!e.ctrlKey) {
          const aboutEl = (e.target as HTMLElement | null)?.closest(
            '.about-overlay'
          ) as HTMLElement | null;
          if (aboutEl && aboutEl.scrollHeight > aboutEl.clientHeight + 4) {
            const atBottom =
              aboutEl.scrollTop + aboutEl.clientHeight >= aboutEl.scrollHeight - 4;
            if (normalizedDeltaY < 0 || !atBottom) {
              return;
            }
          }
        }

        e.preventDefault();
        if (normalizedDeltaY > 0) {
          const threshold = e.ctrlKey ? 82 : 180;
          wheelPinchAccumRef.current += normalizedDeltaY;
          const progress = Math.min(1, wheelPinchAccumRef.current / threshold);
          onAboutPinchProgress?.(progress);

          if (wheelPinchAccumRef.current >= threshold) {
            resetAboutPinchVisual();
            onPinchOutFromAbout();
            return;
          }

          if (wheelResetTimerRef.current) {
            window.clearTimeout(wheelResetTimerRef.current);
          }
          wheelResetTimerRef.current = window.setTimeout(
            resetAboutPinchVisual,
            280
          );
        }
        return;
      }

      // NETWORK or NODE_PREVIEW: allow scrolling inside HUD filter strip or overview panel
      const targetEl = e.target as HTMLElement | null;
      const filterStrip = targetEl?.closest('.filter-strip') as HTMLElement | null;
      if (filterStrip && !e.ctrlKey) {
        e.preventDefault();
        const delta =
          Math.abs(e.deltaX) > Math.abs(normalizedDeltaY)
            ? e.deltaX
            : normalizedDeltaY;
        filterStrip.scrollLeft += delta;
        return;
      }

      if (targetEl?.closest('.overview-panel') && !e.ctrlKey) {
        return;
      }

      // Zoom neural network cleanly around cursor (supports trackpad pinch AND mouse scroll wheels)
      if (Math.abs(normalizedDeltaY) < 0.01) return;
      e.preventDefault();
      const intensity = e.ctrlKey ? 0.011 : 0.0026;
      const clampedDelta = Math.max(-220, Math.min(220, normalizedDeltaY));
      const factor = Math.exp(-clampedDelta * intensity);
      onZoom(factor, e.clientX, e.clientY);
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size === 2) {
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        prevPinchDistRef.current = dist;
        initialPinchDistRef.current = dist;
        triggeredGestureRef.current = false;
        draggingPointerIdRef.current = null;
        onDraggingChange?.(false);
        return;
      }

      // Start canvas pan only in NETWORK/NODE_PREVIEW and only when not pressing a button/link
      if (
        (viewMode === 'NETWORK' || viewMode === 'NODE_PREVIEW') &&
        pointersRef.current.size === 1 &&
        e.button === 0
      ) {
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, a, .overview-panel, .network-hud')) {
          return;
        }
        draggingPointerIdRef.current = e.pointerId;
        lastDragPosRef.current = { x: e.clientX, y: e.clientY };
        onDraggingChange?.(true);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') {
        onPointerMoveScreen?.(e.clientX, e.clientY);
      }

      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Multi-touch 2-finger pinch (yields to TouchEvent handler when active on iOS/mobile)
      if (pointersRef.current.size === 2 && !touchPinchActiveRef.current) {
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const midX = (pts[0].x + pts[1].x) * 0.5;
        const midY = (pts[0].y + pts[1].y) * 0.5;

        if (viewMode === 'ABOUT_FULLSCREEN' && initialPinchDistRef.current) {
          const ratio = dist / Math.max(1, initialPinchDistRef.current);
          // Pinch fingers together (ratio < 1) -> zoom out into neural network
          const progress = Math.max(0, Math.min(1, (1 - ratio) / 0.22));
          onAboutPinchProgress?.(progress);
          if (ratio < 0.8 && !triggeredGestureRef.current) {
            triggeredGestureRef.current = true;
            onAboutPinchProgress?.(0);
            onPinchOutFromAbout();
          }
        } else if (
          viewMode === 'PROJECT_FULLSCREEN' &&
          initialPinchDistRef.current
        ) {
          const ratio = dist / Math.max(1, initialPinchDistRef.current);
          if (ratio < 0.8 && !triggeredGestureRef.current) {
            triggeredGestureRef.current = true;
            onPinchOutFromCatalog();
          }
        } else if (
          (viewMode === 'NETWORK' || viewMode === 'NODE_PREVIEW') &&
          prevPinchDistRef.current &&
          prevPinchDistRef.current > 0
        ) {
          const factor = dist / prevPinchDistRef.current;
          onZoom(factor, midX, midY);
        }

        prevPinchDistRef.current = dist;
        return;
      }

      // Single-pointer pan
      if (
        draggingPointerIdRef.current === e.pointerId &&
        lastDragPosRef.current
      ) {
        const dx = e.clientX - lastDragPosRef.current.x;
        const dy = e.clientY - lastDragPosRef.current.y;
        lastDragPosRef.current = { x: e.clientX, y: e.clientY };
        onPan(dx, dy);
      }
    };

    const handlePointerUpOrCancel = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);

      if (pointersRef.current.size < 2) {
        prevPinchDistRef.current = null;
        initialPinchDistRef.current = null;
        if (!triggeredGestureRef.current && viewMode === 'ABOUT_FULLSCREEN') {
          onAboutPinchProgress?.(0);
        }
      }

      if (draggingPointerIdRef.current === e.pointerId) {
        draggingPointerIdRef.current = null;
        lastDragPosRef.current = null;
        onDraggingChange?.(false);
      }
    };

    // Dedicated non-passive TouchEvent 2-finger pinch handler for iOS Safari / mobile reliability
    const handleTouchStart = (e: TouchEvent) => {
      if (
        e.touches.length === 2 &&
        (viewMode === 'ABOUT_FULLSCREEN' || viewMode === 'PROJECT_FULLSCREEN')
      ) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        touchInitialDistRef.current = Math.hypot(dx, dy);
        touchPinchActiveRef.current = true;
        triggeredGestureRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchPinchActiveRef.current || e.touches.length !== 2) return;
      if (viewMode !== 'ABOUT_FULLSCREEN' && viewMode !== 'PROJECT_FULLSCREEN') {
        return;
      }
      e.preventDefault();

      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const initial = touchInitialDistRef.current;
      if (!initial || initial < 1) return;

      const ratio = dist / initial;
      if (viewMode === 'ABOUT_FULLSCREEN') {
        const progress = Math.max(0, Math.min(1, (1 - ratio) / 0.2));
        onAboutPinchProgress?.(progress);
        if (ratio < 0.82 && !triggeredGestureRef.current) {
          triggeredGestureRef.current = true;
          touchPinchActiveRef.current = false;
          touchInitialDistRef.current = null;
          onAboutPinchProgress?.(0);
          onPinchOutFromAbout();
        }
      } else if (viewMode === 'PROJECT_FULLSCREEN') {
        if (ratio < 0.82 && !triggeredGestureRef.current) {
          triggeredGestureRef.current = true;
          touchPinchActiveRef.current = false;
          touchInitialDistRef.current = null;
          onPinchOutFromCatalog();
        }
      }
    };

    const handleTouchEndOrCancel = (e: TouchEvent) => {
      if (e.touches.length < 2 && touchPinchActiveRef.current) {
        touchPinchActiveRef.current = false;
        touchInitialDistRef.current = null;
        if (!triggeredGestureRef.current && viewMode === 'ABOUT_FULLSCREEN') {
          onAboutPinchProgress?.(0);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUpOrCancel);
    window.addEventListener('pointercancel', handlePointerUpOrCancel);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEndOrCancel, { passive: true });
    window.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: true });

    return () => {
      if (wheelResetTimerRef.current) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUpOrCancel);
      window.removeEventListener('pointercancel', handlePointerUpOrCancel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEndOrCancel);
      window.removeEventListener('touchcancel', handleTouchEndOrCancel);
    };
  }, [
    containerRef,
    viewMode,
    onPinchOutFromAbout,
    onPinchOutFromCatalog,
    onAboutPinchProgress,
    onPan,
    onZoom,
    onDraggingChange,
    onPointerMoveScreen,
  ]);
}
