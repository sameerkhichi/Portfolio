import {
  Github,
  Linkedin,
  Network,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ProfileData } from '../types/portfolio';
import { nanotechAudio } from '../utils/nanotechAudio';

interface AboutOverlayProps {
  profile: ProfileData;
  projectCount: number;
  visible: boolean;
  pinchProgress: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenProjectLibrary: () => void;
}

export function AboutOverlay({
  profile,
  projectCount,
  visible,
  pinchProgress,
  isMuted,
  onToggleMute,
  onOpenProjectLibrary,
}: AboutOverlayProps) {
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
        <div className="about-telemetry">
          <span className="hud-status-dot" />
          <span>CORE NODE // 00</span>
        </div>

        <button
          type="button"
          className="icon-control-btn"
          style={{ pointerEvents: 'auto' }}
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute nanotech sound effects' : 'Mute nanotech sound effects'}
          title={isMuted ? 'Enable Nanotech SFX' : 'Mute Nanotech SFX'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} color="#00F0FF" />}
        </button>
      </div>

      <div className="about-fullscreen-content">
        <header className="about-hero-header">
          <h1 className="about-name">{profile.name}</h1>

          <div className="about-links-row">
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link-btn"
              onMouseEnter={() => nanotechAudio.playNodeHover()}
            >
              <Github size={18} color="#00F0FF" />
              <span>GitHub</span>
            </a>

            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link-btn"
              onMouseEnter={() => nanotechAudio.playNodeHover()}
            >
              <Linkedin size={18} color="#00F0FF" />
              <span>LinkedIn</span>
            </a>
          </div>
        </header>

        <div className="about-bio-section">
          <p className="about-bio">{profile.bio}</p>
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
