import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ExternalLink,
  Github,
  Lock,
  Maximize2,
  Star,
  User,
  X,
} from 'lucide-react';
import type { PositionedProjectNode } from '../types/portfolio';
import { nanotechAudio } from '../utils/nanotechAudio';
import { triggerHaptic } from '../utils/haptics';

const AUTO_CYCLE_MS = 10000;

interface ProjectCatalogModalProps {
  node: PositionedProjectNode;
  onBackToNetwork: () => void;
  onOpenAbout: () => void;
}

export function ProjectCatalogModal({
  node,
  onBackToNetwork,
  onOpenAbout,
}: ProjectCatalogModalProps) {
  const { project } = node;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isGalleryHovered, setIsGalleryHovered] = useState(false);
  const [cycleResetKey, setCycleResetKey] = useState(0);

  const swipeStartXRef = useRef<number | null>(null);

  const imageCount = project.images.length;
  const hasImages = imageCount > 0;
  const safeIndex = hasImages ? Math.min(activeImageIndex, imageCount - 1) : 0;
  const activeImage = hasImages ? project.images[safeIndex] : null;

  // Reset gallery index when switching to a different project
  useEffect(() => {
    setActiveImageIndex(0);
    setLightboxOpen(false);
    setCycleResetKey((k) => k + 1);
  }, [project.id]);

  const selectImage = useCallback((idx: number) => {
    setActiveImageIndex(idx);
    setCycleResetKey((k) => k + 1);
  }, []);

  const stepImage = useCallback(
    (delta: number) => {
      if (imageCount <= 1) return;
      setActiveImageIndex((prev) => (prev + delta + imageCount) % imageCount);
      setCycleResetKey((k) => k + 1);
      triggerHaptic('light');
      nanotechAudio.playNodeHover();
    },
    [imageCount]
  );

  const openLightbox = useCallback(() => {
    if (!hasImages) return;
    triggerHaptic('medium');
    nanotechAudio.playZoomTransition('in');
    setLightboxOpen(true);
  }, [hasImages]);

  const closeLightbox = useCallback(() => {
    triggerHaptic('dismiss');
    nanotechAudio.playZoomTransition('out');
    setLightboxOpen(false);
    setCycleResetKey((k) => k + 1);
  }, []);

  // Auto-cycle photos every 20s when NOT in fullscreen lightbox and NOT hovering gallery
  const shouldAutoCycle = imageCount > 1 && !lightboxOpen && !isGalleryHovered;
  useEffect(() => {
    if (!shouldAutoCycle) return;
    const timer = window.setTimeout(() => {
      setActiveImageIndex((prev) => (prev + 1) % imageCount);
    }, AUTO_CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [shouldAutoCycle, safeIndex, cycleResetKey, imageCount]);

  // Keyboard navigation inside fullscreen lightbox (capture Escape so modal stays open)
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepImage(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepImage(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [lightboxOpen, closeLightbox, stepImage]);

  return (
    <div
      className="catalog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} full project catalog`}
    >
      <div className="catalog-container">
        <header className="catalog-topbar">
          <div className="catalog-nav-group">
            <button
              type="button"
              className="hud-pill hud-pill-btn"
              onClick={onBackToNetwork}
            >
              <ArrowLeft size={15} color="var(--aqua-core)" />
              <span>Back</span>
            </button>

            <button
              type="button"
              className="hud-pill hud-pill-btn"
              onClick={onOpenAbout}
            >
              <User size={15} color="var(--aqua-core)" />
              <span>About Me</span>
            </button>
          </div>

          <div className="catalog-nav-group">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hud-pill hud-pill-btn"
                style={{ textDecoration: 'none' }}
                onMouseEnter={() => nanotechAudio.playNodeHover()}
              >
                <Github size={15} color="var(--aqua-core)" />
                <span>View Repository</span>
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hud-pill hud-pill-btn"
                style={{ textDecoration: 'none' }}
                onMouseEnter={() => nanotechAudio.playNodeHover()}
              >
                <ExternalLink size={15} color="var(--aqua-core)" />
                <span>
                  {project.liveUrl.includes('apps.apple.com')
                    ? 'App Store'
                    : project.liveUrl.includes('drive.google.com')
                      ? 'Download Build'
                      : 'Live Demo'}
                </span>
              </a>
            )}
          </div>
        </header>

        {/* Top Row: Left Gallery Card + Right Quick-Overview Card */}
        <div className="catalog-hero">
          {/* Left Column: Image Preview + Auto-Cycle + Expanding Thumbnail Grid */}
          <div
            className="catalog-gallery-card"
            onMouseEnter={() => setIsGalleryHovered(true)}
            onMouseLeave={() => setIsGalleryHovered(false)}
          >
            <div className="catalog-main-image-wrap">
              {activeImage ? (
                <>
                  <img
                    src={activeImage.src}
                    alt={activeImage.alt}
                    className="catalog-main-image is-clickable"
                    onClick={openLightbox}
                    title="Click to view fullscreen"
                  />
                  <button
                    type="button"
                    className="gallery-expand-btn"
                    onClick={openLightbox}
                    aria-label="Open gallery fullscreen closeup"
                    title="View fullscreen"
                  >
                    <Maximize2 size={15} />
                  </button>
                  {imageCount > 1 && (
                    <span className="gallery-counter-pill">
                      {safeIndex + 1} / {imageCount}
                    </span>
                  )}
                  {imageCount > 1 && (
                    <div className="gallery-cycle-track" aria-hidden="true">
                      <span
                        key={`${safeIndex}-${cycleResetKey}`}
                        className={`gallery-cycle-fill ${
                          shouldAutoCycle ? 'is-running' : 'is-paused'
                        }`}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="blueprint-placeholder">
                  <div className="blueprint-header">
                    <span>
                      {project.source === 'custom'
                        ? 'Custom'
                        : 'Autosynced from GitHub'}
                    </span>
                    <span>{project.displayDate}</span>
                  </div>

                  <div className="blueprint-center">
                    <div className="blueprint-orb">
                      <Cpu size={32} />
                    </div>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                      {project.title}
                    </strong>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.74rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {project.techStack.join(' · ')}
                    </span>
                  </div>

                  <div className="blueprint-header">
                    <span>RECENCY INDEX: {Math.round(node.recencyScore * 100)}%</span>
                    <span>
                      {project.isPrivate ? 'ACCESS: PRIVATE' : 'ACCESS: PUBLIC'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {activeImage?.caption && (
              <div className="catalog-caption">{activeImage.caption}</div>
            )}

            {hasImages && imageCount > 1 && (
              <div className="catalog-thumbs" role="list" aria-label="Project gallery thumbnails">
                {project.images.map((img, idx) => (
                  <button
                    key={`${img.src}-${idx}`}
                    type="button"
                    className={`catalog-thumb-btn ${
                      idx === safeIndex ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      selectImage(idx);
                      triggerHaptic('light');
                      nanotechAudio.playNodeHover();
                    }}
                    aria-label={`View image ${idx + 1}: ${img.alt}`}
                  >
                    <img src={img.src} alt={img.alt} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Title, Date & Categories, Short Summary, Technologies */}
          <div className="catalog-details-card">
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
              {typeof project.stars === 'number' && project.stars > 0 && (
                <span className="meta-pill">
                  <Star
                    size={11}
                    style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }}
                  />
                  {project.stars}
                </span>
              )}
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

            <h1 className="catalog-title">{project.title}</h1>

            <p className="catalog-short-summary">{project.shortDescription}</p>

            <div>
              <div className="section-micro-label">Technologies</div>
              <div className="tech-badge-list" style={{ marginBottom: 0 }}>
                {project.techStack.map((tech) => (
                  <span key={tech} className="tech-badge">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Full-Width Card: Longer Summary & Key Highlights */}
        <section className="catalog-deepdive-card" aria-label="Project details and highlights">
          <div>
            <div className="section-micro-label">Overview</div>
            <p className="catalog-summary">{project.fullSummary}</p>
          </div>

          {project.highlights.length > 0 && (
            <div>
              <div className="section-micro-label">Key Highlights</div>
              <ul
                className={`catalog-highlights ${
                  project.highlights.length >= 4 ? 'is-two-col' : ''
                }`}
              >
                {project.highlights.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Fullscreen Gallery Lightbox */}
      {lightboxOpen && activeImage && (
        <div
          className="lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Fullscreen image ${safeIndex + 1} of ${imageCount}`}
          onClick={closeLightbox}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              swipeStartXRef.current = e.touches[0].clientX;
            }
          }}
          onTouchEnd={(e) => {
            if (swipeStartXRef.current === null || e.changedTouches.length === 0) {
              return;
            }
            const dx = e.changedTouches[0].clientX - swipeStartXRef.current;
            swipeStartXRef.current = null;
            if (Math.abs(dx) > 45) {
              stepImage(dx < 0 ? 1 : -1);
            }
          }}
        >
          <div className="lightbox-topbar" onClick={(e) => e.stopPropagation()}>
            <span className="hud-pill">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                {safeIndex + 1} / {imageCount}
              </span>
            </span>

            <button
              type="button"
              className="icon-control-btn"
              onClick={closeLightbox}
              aria-label="Close fullscreen gallery"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
            {imageCount > 1 && (
              <button
                type="button"
                className="lightbox-nav-btn is-prev"
                onClick={() => stepImage(-1)}
                aria-label="Previous image"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="lightbox-image"
            />

            {imageCount > 1 && (
              <button
                type="button"
                className="lightbox-nav-btn is-next"
                onClick={() => stepImage(1)}
                aria-label="Next image"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {activeImage.caption && (
            <div className="lightbox-caption" onClick={(e) => e.stopPropagation()}>
              {activeImage.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
