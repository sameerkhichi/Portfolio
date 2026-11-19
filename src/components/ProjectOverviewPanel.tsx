import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  Github,
  Lock,
  Maximize2,
  X,
} from 'lucide-react';
import type { PositionedProjectNode } from '../types/portfolio';
import { nanotechAudio } from '../utils/nanotechAudio';

interface ProjectOverviewPanelProps {
  node: PositionedProjectNode;
  onExpandFull: () => void;
  onClose: () => void;
}

export function ProjectOverviewPanel({
  node,
  onExpandFull,
  onClose,
}: ProjectOverviewPanelProps) {
  const { project } = node;
  const panelRef = useRef<HTMLElement | null>(null);
  const [dragY, setDragY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [hasPulled, setHasPulled] = useState(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Native-feeling pull-down-to-dismiss on mobile that NEVER interrupts scrolling
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    let startY = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocityY = 0;
    let currentDrag = 0;
    let gestureMode: 'idle' | 'undecided' | 'scrolling' | 'dragging' = 'idle';
    let startedOnHandle = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        gestureMode = 'idle';
        return;
      }
      const target = e.target as HTMLElement | null;
      startedOnHandle = Boolean(target?.closest('.overview-drag-handle-wrap'));
      startY = e.touches[0].clientY;
      lastY = startY;
      lastTime = performance.now();
      velocityY = 0;
      currentDrag = 0;
      gestureMode = 'undecided';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (gestureMode === 'idle' || e.touches.length !== 1) return;

      const y = e.touches[0].clientY;
      const dy = y - startY;
      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      velocityY = (y - lastY) / dt;
      lastY = y;
      lastTime = now;

      if (gestureMode === 'undecided') {
        if (Math.abs(dy) < 6) return;

        // Only enter pull-to-dismiss if dragging DOWN while already scrolled to top (or on the grab handle).
        // Otherwise lock to native scrolling for the ENTIRE rest of this touch so scrolling never breaks!
        if (dy > 0 && (startedOnHandle || panel.scrollTop <= 1)) {
          gestureMode = 'dragging';
          setHasPulled(true);
          setIsPulling(true);
        } else {
          gestureMode = 'scrolling';
          return;
        }
      }

      if (gestureMode === 'scrolling') {
        return;
      }

      // Actively pulling the sheet downward
      e.preventDefault();
      currentDrag = Math.max(0, dy);
      setDragY(currentDrag);
    };

    const finishPull = () => {
      if (gestureMode === 'dragging') {
        const shouldDismiss =
          currentDrag >= 88 || (velocityY > 0.6 && currentDrag > 36);
        setIsPulling(false);
        setDragY(0);
        if (shouldDismiss) {
          onCloseRef.current();
        }
      }
      gestureMode = 'idle';
      currentDrag = 0;
    };

    panel.addEventListener('touchstart', handleTouchStart, { passive: true });
    panel.addEventListener('touchmove', handleTouchMove, { passive: false });
    panel.addEventListener('touchend', finishPull, { passive: true });
    panel.addEventListener('touchcancel', finishPull, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', finishPull);
      panel.removeEventListener('touchcancel', finishPull);
    };
  }, []);

  const dragStyle =
    hasPulled || isPulling || dragY > 0
      ? {
          animation: 'none',
          transform: `translate3d(0, ${dragY}px, 0)`,
          opacity: Math.max(0.35, 1 - dragY / 360),
          transition: isPulling
            ? 'none'
            : 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.26s ease',
        }
      : undefined;

  return (
    <aside
      ref={panelRef}
      className="overview-panel"
      style={dragStyle}
      aria-label={`Project overview for ${project.title}`}
    >
      <div className="overview-drag-handle-wrap" aria-hidden="true">
        <span className="overview-drag-handle" />
      </div>

      <div className="overview-header">
        <div>
          <div className="overview-meta-row">
            <span className="meta-pill">
              <Calendar
                size={11}
                style={{ display: 'inline', marginRight: 5, verticalAlign: '-1px' }}
              />
              {project.displayDate}
            </span>
            {project.categories.map((cat) => (
              <span key={cat} className="meta-pill is-category">
                {cat}
              </span>
            ))}
            {project.isPrivate && (
              <span className="meta-pill is-private">
                <Lock
                  size={10}
                  style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }}
                />
                Private Repo
              </span>
            )}
          </div>
          <h2 className="overview-title">{project.title}</h2>
        </div>

        <button
          type="button"
          className="icon-control-btn"
          onClick={onClose}
          aria-label="Close project overview"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      <p className="overview-desc">{project.shortDescription}</p>

      <div className="section-micro-label">Tech Stack</div>
      <div className="tech-badge-list">
        {project.techStack.map((tech) => (
          <span key={tech} className="tech-badge">
            {tech}
          </span>
        ))}
      </div>

      <div className="overview-actions">
        <button
          type="button"
          className="expand-catalog-btn"
          onMouseEnter={() => nanotechAudio.playNodeHover()}
          onClick={onExpandFull}
        >
          <Maximize2 size={16} />
          <span>Open Full Catalog</span>
        </button>

        <div className="secondary-link-row">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-action-btn"
              onMouseEnter={() => nanotechAudio.playNodeHover()}
            >
              <Github size={15} color="var(--aqua-core)" />
              <span>GitHub</span>
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-action-btn"
              onMouseEnter={() => nanotechAudio.playNodeHover()}
            >
              <ExternalLink size={15} color="var(--aqua-core)" />
              <span>Live Demo</span>
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
