import { useState } from 'react';
import {
  Github,
  Linkedin,
  Network,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ABOUT_DETAILS } from '../data/portfolioConfig';
import type { AccentTheme, AccentThemeId } from '../data/themes';
import type { ProfileData, ProjectCategory } from '../types/portfolio';
import { nanotechAudio } from '../utils/nanotechAudio';
import { triggerHaptic } from '../utils/haptics';
import { ThemePicker } from './ThemePicker';

interface AboutOverlayProps {
  profile: ProfileData;
  projectCount: number;
  projectAreas: ProjectCategory[];
  visible: boolean;
  pinchProgress: number;
  isMuted: boolean;
  theme: AccentTheme;
  onSelectTheme: (id: AccentThemeId) => void;
  onToggleMute: () => void;
  onOpenProjectLibrary: () => void;
}

export function AboutOverlay({
  profile,
  projectCount,
  projectAreas,
  visible,
  pinchProgress,
  isMuted,
  theme,
  onSelectTheme,
  onToggleMute,
  onOpenProjectLibrary,
}: AboutOverlayProps) {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const pinchScale = visible ? 1 - pinchProgress * 0.22 : 0.55;
  const pinchOpacity = visible ? 1 - pinchProgress * 0.4 : 0;

  return (
    <section
      className={`about-overlay ${!visible ? 'is-exiting' : ''}`}
      style={{
        transform: `scale(${pinchScale})`,
        opacity: pinchOpacity,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      aria-hidden={!visible}
      aria-label="About Me"
    >
      <div className="about-top-bar">
        <div className="about-top-actions">
          <div className="theme-trigger-wrap">
            <button
              type="button"
              data-theme-trigger="true"
              className="icon-control-btn"
              onClick={() => {
                triggerHaptic('light');
                nanotechAudio.playNodeHover();
                setThemeMenuOpen((prev) => !prev);
              }}
              aria-haspopup="menu"
              aria-expanded={themeMenuOpen}
              aria-label="Choose accent color theme"
              title={`Theme: ${theme.name}`}
            >
              <span className="theme-dot-btn-inner" />
            </button>

            <ThemePicker
              open={themeMenuOpen}
              activeThemeId={theme.id}
              align="right"
              onSelect={onSelectTheme}
              onClose={() => setThemeMenuOpen(false)}
            />
          </div>

          <button
            type="button"
            className="icon-control-btn"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute nanotech sound effects' : 'Mute nanotech sound effects'}
            title={isMuted ? 'Enable Nanotech SFX' : 'Mute Nanotech SFX'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} color="var(--aqua-core)" />}
          </button>
        </div>
      </div>

      <div className="about-fullscreen-content">
        <header className="about-hero-header">
          <div className="about-name-group">
            <h1 className="about-name">{profile.name}</h1>
            <div className="about-city-sub">{ABOUT_DETAILS.city}</div>
          </div>

          <div className="about-links-row">
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link-btn"
              onMouseEnter={() => nanotechAudio.playNodeHover()}
            >
              <Github size={18} color="var(--aqua-core)" />
              <span>GitHub</span>
            </a>

            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link-btn"
              onMouseEnter={() => nanotechAudio.playNodeHover()}
            >
              <Linkedin size={18} color="var(--aqua-core)" />
              <span>LinkedIn</span>
            </a>
          </div>

          <p className="about-bio">{profile.bio}</p>
        </header>

        {/* Two-Column Liquid Glass Overview: Story (Left) + Quick Reads (Right) */}
        <div className="about-bento-grid">
          <article className="about-glass-card about-story-card" aria-label="About Sameer">
            <div className="section-micro-label">About Me</div>
            <div className="about-story-body">
              {ABOUT_DETAILS.storyParagraphs.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </article>

          <aside className="about-glass-card about-quick-card" aria-label="Quick summary">
            <div className="about-quick-section">
              <div className="section-micro-label">Interested Fields</div>
              <div className="about-pill-group">
                {ABOUT_DETAILS.interestedFields.map((field) => (
                  <span key={field} className="about-highlight-pill">
                    {field}
                  </span>
                ))}
              </div>
            </div>

            <div className="about-quick-divider" />

            <div className="about-quick-section">
              <div className="section-micro-label">Experience &amp; Education</div>
              <div className="about-exp-list">
                {ABOUT_DETAILS.experience.map((item) => (
                  <div key={`${item.role}-${item.organization}`} className="about-exp-item">
                    <div className="about-exp-role">{item.role}</div>
                    <div className="about-exp-org">{item.organization}</div>
                    <div className="about-exp-meta">{item.meta}</div>
                  </div>
                ))}
              </div>
            </div>

            {projectAreas.length > 0 && (
              <>
                <div className="about-quick-divider" />
                <div className="about-quick-section">
                  <div className="section-micro-label">Project Areas</div>
                  <div className="about-pill-group">
                    {projectAreas.map((area) => (
                      <span key={area} className="tech-badge">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>

        <div className="about-cta-section">
          <button
            type="button"
            className="primary-library-btn"
            onMouseEnter={() => nanotechAudio.playNodeHover()}
            onClick={onOpenProjectLibrary}
          >
            <Network size={22} />
            <span>Project Library</span>
            {projectCount > 0 && (
              <span className="library-count-pill">{projectCount}</span>
            )}
          </button>

          <div className="pinch-hint">
            <span>click or pinch screen</span>
          </div>
        </div>
      </div>
    </section>
  );
}
