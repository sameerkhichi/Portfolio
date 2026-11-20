import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Cpu,
  ExternalLink,
  Github,
  Lock,
  Star,
  User,
} from 'lucide-react';
import type { PositionedProjectNode } from '../types/portfolio';
import { nanotechAudio } from '../utils/nanotechAudio';

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

  const hasImages = project.images.length > 0;
  const activeImage = hasImages
    ? project.images[Math.min(activeImageIndex, project.images.length - 1)]
    : null;

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
              <span>Back to Network</span>
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
                  {project.liveUrl.includes('apps.apple.com') ? 'App Store' : 'Live Demo'}
                </span>
              </a>
            )}
          </div>
        </header>

        <div className="catalog-hero">
          {/* Left Column: Image Gallery or Neural Schematic Blueprint */}
          <div className="catalog-gallery-card">
            <div className="catalog-main-image-wrap">
              {activeImage ? (
                <img
                  src={activeImage.src}
                  alt={activeImage.alt}
                  className="catalog-main-image"
                />
              ) : (
                <div className="blueprint-placeholder">
                  <div className="blueprint-header">
                    <span>NODE SCHEMATIC // {project.id.toUpperCase()}</span>
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

            {hasImages && project.images.length > 1 && (
              <div className="catalog-thumbs">
                {project.images.map((img, idx) => (
                  <button
                    key={`${img.src}-${idx}`}
                    type="button"
                    className={`catalog-thumb-btn ${
                      idx === activeImageIndex ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      setActiveImageIndex(idx);
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

          {/* Right Column: Full Summary, Highlights & Tech Stack */}
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
                  Private Repository
                </span>
              )}
            </div>

            <h1 className="catalog-title">{project.title}</h1>

            <p className="catalog-summary">{project.fullSummary}</p>

            {project.highlights.length > 0 && (
              <div>
                <div className="section-micro-label">Key Highlights</div>
                <ul className="catalog-highlights">
                  {project.highlights.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

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
      </div>
    </div>
  );
}
