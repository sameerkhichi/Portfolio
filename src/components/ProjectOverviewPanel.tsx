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

  return (
    <aside
      className="overview-panel"
      aria-label={`Project overview for ${project.title}`}
    >
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
              <Github size={15} color="#00F0FF" />
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
              <ExternalLink size={15} color="#00F0FF" />
              <span>Live Demo</span>
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
