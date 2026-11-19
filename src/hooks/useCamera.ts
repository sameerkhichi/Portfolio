import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraState, PositionedProjectNode } from '../types/portfolio';

export const MIN_ZOOM = 0.38;
export const MAX_ZOOM = 2.8;
export const ABOUT_CORE_ZOOM = 2.35;

interface ViewportSize {
  width: number;
  height: number;
}

export function useCamera(initialZoom = ABOUT_CORE_ZOOM) {
  const currentRef = useRef<CameraState>({ x: 0, y: 0, zoom: initialZoom });
  const targetRef = useRef<CameraState>({ x: 0, y: 0, zoom: initialZoom });
  const velocityRef = useRef<number>(0);

  const [camera, setCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    zoom: initialZoom,
  });

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const cur = currentRef.current;
      const tgt = targetRef.current;

      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      const dz = tgt.zoom - cur.zoom;

      // Frame-rate independent exponential smoothing (silky across 60Hz/90Hz/120Hz mobile displays)
      const alpha = 1 - Math.exp(-10 * dt);
      if (Math.abs(dx) > 0.12 || Math.abs(dy) > 0.12 || Math.abs(dz) > 0.001) {
        const stepX = dx * alpha;
        const stepY = dy * alpha;
        const stepZ = dz * alpha;

        cur.x += stepX;
        cur.y += stepY;
        cur.zoom += stepZ;
        velocityRef.current = Math.hypot(stepX, stepY) + Math.abs(stepZ) * 140;

        setCamera({ x: cur.x, y: cur.y, zoom: cur.zoom });
      } else {
        if (cur.x !== tgt.x || cur.y !== tgt.y || cur.zoom !== tgt.zoom) {
          cur.x = tgt.x;
          cur.y = tgt.y;
          cur.zoom = tgt.zoom;
          setCamera({ x: cur.x, y: cur.y, zoom: cur.zoom });
        }
        velocityRef.current *= 0.82;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const setTarget = useCallback((next: Partial<CameraState>) => {
    targetRef.current = {
      x: next.x ?? targetRef.current.x,
      y: next.y ?? targetRef.current.y,
      zoom: Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, next.zoom ?? targetRef.current.zoom)
      ),
    };
  }, []);

  const focusCenter = useCallback((zoom = ABOUT_CORE_ZOOM) => {
    targetRef.current = {
      x: 0,
      y: 0,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)),
    };
  }, []);

  const fitNetwork = useCallback(
    (nodes: PositionedProjectNode[], viewport: ViewportSize) => {
      const maxRadius = nodes.reduce((acc, n) => Math.max(acc, n.radius + 95), 340);
      const minDim = Math.min(viewport.width, viewport.height);
      const idealZoom = Math.max(
        MIN_ZOOM,
        Math.min(1.05, (minDim * 0.44) / Math.max(240, maxRadius))
      );
      targetRef.current = { x: 0, y: 0, zoom: idealZoom };
    },
    []
  );

  const focusNode = useCallback(
    (node: PositionedProjectNode, viewport: ViewportSize) => {
      const focusZoom = viewport.width < 860 ? 1.05 : 1.26;
      // Offset camera slightly right in world space so node sits cleanly left of Overview Panel
      const worldOffsetX = viewport.width >= 860 ? 150 / focusZoom : 0;
      const worldOffsetY = viewport.width < 860 ? 110 / focusZoom : 0;
      targetRef.current = {
        x: node.x + worldOffsetX,
        y: node.y + worldOffsetY,
        zoom: focusZoom,
      };
    },
    []
  );

  const panByScreenDelta = useCallback((dxScreen: number, dyScreen: number) => {
    const z = Math.max(MIN_ZOOM, targetRef.current.zoom);
    targetRef.current = {
      ...targetRef.current,
      x: targetRef.current.x - dxScreen / z,
      y: targetRef.current.y - dyScreen / z,
    };
    velocityRef.current = Math.max(
      velocityRef.current,
      Math.hypot(dxScreen, dyScreen)
    );
  }, []);

  const zoomByFactor = useCallback(
    (
      factor: number,
      focalClientX?: number,
      focalClientY?: number,
      viewport?: ViewportSize
    ) => {
      const prev = targetRef.current;
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor));
      if (Math.abs(nextZoom - prev.zoom) < 0.0001) return nextZoom;

      if (
        focalClientX !== undefined &&
        focalClientY !== undefined &&
        viewport
      ) {
        const offsetX = focalClientX - viewport.width / 2;
        const offsetY = focalClientY - viewport.height / 2;
        const worldX = prev.x + offsetX / prev.zoom;
        const worldY = prev.y + offsetY / prev.zoom;
        targetRef.current = {
          x: worldX - offsetX / nextZoom,
          y: worldY - offsetY / nextZoom,
          zoom: nextZoom,
        };
      } else {
        targetRef.current = { ...prev, zoom: nextZoom };
      }

      return nextZoom;
    },
    []
  );

  return {
    camera,
    cameraRef: currentRef,
    targetRef,
    velocityRef,
    setTarget,
    focusCenter,
    fitNetwork,
    focusNode,
    panByScreenDelta,
    zoomByFactor,
  };
}
