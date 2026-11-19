import { useMemo, useState } from 'react';
import {
  Maximize2,
  Minus,
  Plus,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  PROJECT_CATEGORIES,
  type CameraState,
  type PositionedProjectNode,
  type ProfileData,
  type ProjectCategory,
  type SynapseEdge,
  type ViewMode,
} from '../types/portfolio';
import { NeuralCanvas } from './NeuralCanvas';
import { nanotechAudio } from '../utils/nanotechAudio';

interface NeuralNetworkViewProps {
  profile: ProfileData;
  nodes: PositionedProjectNode[];
  edges: SynapseEdge[];
  camera: CameraState;
  cameraRef: React.MutableRefObject<CameraState>;
  velocityRef: React.MutableRefObject<number>;
  pointerScreenRef: React.MutableRefObject<{ x: number; y: number; active: boolean }>;
  viewport: { width: number; height: number };
  viewMode: ViewMode;
  generationEpoch: number;
  selectedNodeId: string | null;
  isDragging: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenAbout: () => void;
  onSelectNode: (node: PositionedProjectNode) => void;
  onExpandNode: (node: PositionedProjectNode) => void;
  onDeselect: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
}

export function NeuralNetworkView({
  profile,
  nodes,
  edges,
  camera,
  cameraRef,
  velocityRef,
  pointerScreenRef,
  viewport,
  viewMode,
  generationEpoch,
  selectedNodeId,
  isDragging,
  isMuted,
  onToggleMute,
  onOpenAbout,
  onSelectNode,
  onExpandNode,
  onDeselect,
  onZoomIn,
  onZoomOut,
  onFitAll,
}: NeuralNetworkViewProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ProjectCategory | null>(null);
  const [revealedNodeIds, setRevealedNodeIds] = useState<Set<string>>(new Set());

  const initials = useMemo(() => {
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return profile.name.slice(0, 2).toUpperCase();
  }, [profile.name]);

  const visibleCategories = useMemo(
    () =>
      PROJECT_CATEGORIES.filter((category) =>
        nodes.some((node) => node.project.categories.includes(category))
      ),
    [nodes]
  );

  const effectiveFilter =
    activeFilter && visibleCategories.includes(activeFilter)
      ? activeFilter
      : null;

  const toScreen = (wx: number, wy: number) => ({
    x: viewport.width * 0.5 + (wx - camera.x) * camera.zoom,
    y: viewport.height * 0.5 + (wy - camera.y) * camera.zoom,
  });

  const corePos = toScreen(0, 0);
  const showInteractiveGraph =
    viewMode === 'NETWORK' || viewMode === 'NODE_PREVIEW';

  return (
    <div
      className={`neural-viewport ${isDragging ? 'is-dragging' : ''}`}
      onClick={(e) => {
        if (
          viewMode === 'NODE_PREVIEW' &&
          !(e.target as HTMLElement).closest('button, .overview-panel, .network-hud')
        ) {
          onDeselect();
        }
      }}
    >
      <NeuralCanvas
        nodes={nodes}
        edges={edges}
        cameraRef={cameraRef}
        velocityRef={velocityRef}
        pointerScreenRef={pointerScreenRef}
        viewMode={viewMode}
        generationEpoch={generationEpoch}
        selectedNodeId={selectedNodeId}
        hoveredNodeId={hoveredNodeId}
        activeFilter={effectiveFilter}
        onNodeRevealChange={setRevealedNodeIds}
      />

      {/* Synchronized Interactive DOM Node Layer */}
      <div
        className="node-layer"
        style={{
          opacity: showInteractiveGraph ? 1 : 0,
          pointerEvents: showInteractiveGraph ? 'none' : 'none',
        }}
        aria-hidden={!showInteractiveGraph}
      >
        {/* Center Core Node: About Me */}
        <button
          type="button"
          className="core-node-btn"
          style={{
            transform: `translate3d(${corePos.x}px, ${corePos.y}px, 0) scale(${Math.max(
              0.72,
              Math.min(1.22, camera.zoom)
            )})`,
            pointerEvents: showInteractiveGraph ? 'auto' : 'none',
          }}
          onMouseEnter={() => nanotechAudio.playNodeHover()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenAbout();
          }}
          aria-label="Open About Me core summary"
          title="Return to About Me"
        >
          <span className="core-node-initials">{initials}</span>
          <span className="core-node-label">About Me</span>
        </button>

        {/* Project Nodes */}
        {nodes.map((node) => {
          const pos = toScreen(node.x, node.y);
          const isSelected = selectedNodeId === node.project.id;
          const isRevealed =
            revealedNodeIds.has(node.project.id) || isSelected;
          const matchesFilter =
            !effectiveFilter ||
            node.project.categories.includes(effectiveFilter);

          const scaleFactor = Math.max(0.74, Math.min(1.22, camera.zoom * 1.05));
          const diameter = Math.round(node.nodeSize * 2);

          return (
            <div
              key={node.project.id}
              className={`project-node-wrapper ${isSelected ? 'is-selected' : ''} ${
                !matchesFilter ? 'is-dimmed' : ''
              }`}
              style={{
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -${
                  diameter * 0.5
                }px) scale(${isRevealed ? scaleFactor : scaleFactor * 0.35})`,
                opacity: showInteractiveGraph ? (isRevealed ? 1 : 0) : 0,
                pointerEvents: showInteractiveGraph && isRevealed ? 'auto' : 'none',
              }}
            >
              <button
                type="button"
                className="project-node-btn"
                style={{ width: diameter, height: diameter }}
                onMouseEnter={() => {
                  setHoveredNodeId(node.project.id);
                  nanotechAudio.playNodeHover();
                }}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected) {
                    onExpandNode(node);
                  } else {
                    onSelectNode(node);
                  }
                }}
                aria-label={
                  isSelected
                    ? `Open full catalog for ${node.project.title}`
                    : `Inspect project ${node.project.title}`
                }
              >
                <span className="project-node-core-dot" />
                {isSelected && <span className="project-node-pulse-ring" />}
              </button>

              <div className="project-node-caption">
                <span className="project-node-title">{node.project.title}</span>
                <span className="project-node-date">{node.project.displayDate}</span>
                {isSelected && (
                  <span className="project-node-expand-hint">
                    Click again to full-screen
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Futuristic Neural HUD */}
      <div className={`network-hud ${!showInteractiveGraph ? 'is-hidden' : ''}`}>
        <div className="hud-top">
          <div className="hud-brand-group">
            <div className="hud-pill">
              <span className="hud-status-dot" />
              <strong>{profile.name}</strong>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--aqua-glow)',
                }}
              >
                // {nodes.length} NODES
              </span>
            </div>

            <button
              type="button"
              className="hud-pill hud-pill-btn"
              onClick={onOpenAbout}
            >
              <User size={15} color="#00F0FF" />
              <span>About Me</span>
            </button>
          </div>

          <div className="hud-right-group">
            {visibleCategories.length > 0 && (
              <div
                className="filter-strip"
                role="group"
                aria-label="Filter projects by project type"
              >
                <button
                  type="button"
                  className={`filter-chip ${effectiveFilter === null ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveFilter(null);
                    nanotechAudio.playNodeHover();
                  }}
                >
                  All
                </button>
                {visibleCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`filter-chip ${effectiveFilter === category ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveFilter(effectiveFilter === category ? null : category);
                      nanotechAudio.playNodeHover();
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="icon-control-btn"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute nanotech sound effects' : 'Mute nanotech sound effects'}
              title={isMuted ? 'Enable Nanotech SFX' : 'Mute Nanotech SFX'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} color="#00F0FF" />}
            </button>
          </div>
        </div>

        <div className="hud-bottom">
          <div className="recency-legend">
            <span>Center: Recent</span>
            <span className="recency-bar" />
            <span>Outer: Earlier</span>
          </div>

          <div className="zoom-controls">
            <span className="zoom-readout">{Math.round(camera.zoom * 100)}%</span>
            <button
              type="button"
              className="icon-control-btn"
              onClick={onZoomOut}
              aria-label="Zoom out"
              title="Zoom Out"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              className="icon-control-btn"
              onClick={onZoomIn}
              aria-label="Zoom in"
              title="Zoom In"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              className="icon-control-btn"
              onClick={onFitAll}
              aria-label="Fit entire neural network in view"
              title="Fit All Nodes"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
