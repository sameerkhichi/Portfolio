import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Minus,
  Plus,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CORE_INITIALS } from '../data/portfolioConfig';
import type { AccentTheme, AccentThemeId } from '../data/themes';
import {
  PROJECT_CATEGORIES,
  type CameraState,
  type PositionedProjectNode,
  type ProfileData,
  type ProjectCategory,
  type SynapseEdge,
  type ViewMode,
  type YearRing,
} from '../types/portfolio';
import { NeuralCanvas } from './NeuralCanvas';
import { ThemePicker } from './ThemePicker';
import { nanotechAudio } from '../utils/nanotechAudio';
import { triggerHaptic } from '../utils/haptics';

interface NeuralNetworkViewProps {
  profile: ProfileData;
  nodes: PositionedProjectNode[];
  edges: SynapseEdge[];
  yearRings: YearRing[];
  theme: AccentTheme;
  onSelectTheme: (id: AccentThemeId) => void;
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
  yearRings,
  theme,
  onSelectTheme,
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
  const [themeMenuOpen, setThemeMenuOpen] = useState<boolean>(false);
  const filterStripRef = useRef<HTMLDivElement | null>(null);
  const [filterScrollState, setFilterScrollState] = useState({
    canLeft: false,
    canRight: false,
  });

  const updateFilterScrollState = useCallback(() => {
    const strip = filterStripRef.current;
    if (!strip) {
      setFilterScrollState({ canLeft: false, canRight: false });
      return;
    }
    const maxScroll = strip.scrollWidth - strip.clientWidth;
    setFilterScrollState({
      canLeft: strip.scrollLeft > 4,
      canRight: maxScroll - strip.scrollLeft > 4,
    });
  }, []);

  const scrollFilterStrip = useCallback((direction: -1 | 1) => {
    const strip = filterStripRef.current;
    if (!strip) return;
    strip.scrollBy({ left: direction * 180, behavior: 'smooth' });
  }, []);

  const initials = CORE_INITIALS;

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

  useEffect(() => {
    updateFilterScrollState();
  }, [visibleCategories, viewport.width, updateFilterScrollState]);

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
        yearRings={yearRings}
        theme={theme}
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
              0.55,
              Math.min(1.45, camera.zoom)
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

          const scaleFactor = Math.max(0.55, Math.min(1.45, camera.zoom * 1.05));
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
            <div className="theme-trigger-wrap">
              <button
                type="button"
                data-theme-trigger="true"
                className="hud-pill hud-pill-btn"
                onClick={() => {
                  triggerHaptic('light');
                  nanotechAudio.playNodeHover();
                  setThemeMenuOpen((prev) => !prev);
                }}
                aria-haspopup="menu"
                aria-expanded={themeMenuOpen}
                title="Change accent theme"
              >
                <span className="hud-status-dot" />
                <strong>{profile.name}</strong>
              </button>

              <ThemePicker
                open={themeMenuOpen}
                activeThemeId={theme.id}
                align="left"
                onSelect={onSelectTheme}
                onClose={() => setThemeMenuOpen(false)}
              />
            </div>

            <button
              type="button"
              className="hud-pill hud-pill-btn"
              onClick={onOpenAbout}
            >
              <User size={15} color="var(--aqua-core)" />
              <span>About Me</span>
            </button>
          </div>

          <div className="hud-right-group">
            {visibleCategories.length > 0 && (
              <div className="filter-strip-shell">
                {filterScrollState.canLeft && (
                  <button
                    type="button"
                    className="filter-scroll-btn is-left"
                    onClick={() => scrollFilterStrip(-1)}
                    aria-label="Scroll categories left"
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}

                <div
                  ref={filterStripRef}
                  className="filter-strip"
                  role="group"
                  aria-label="Filter projects by project type"
                  onScroll={updateFilterScrollState}
                >
                  <button
                    type="button"
                    className={`filter-chip ${effectiveFilter === null ? 'is-active' : ''}`}
                    onClick={() => {
                      triggerHaptic('light');
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
                        triggerHaptic('light');
                        setActiveFilter(effectiveFilter === category ? null : category);
                        nanotechAudio.playNodeHover();
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {filterScrollState.canRight && (
                  <button
                    type="button"
                    className="filter-scroll-btn is-right"
                    onClick={() => scrollFilterStrip(1)}
                    aria-label="Scroll categories right"
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}

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
              aria-label="Recenter neural network view"
              title="Recenter View"
            >
              <LocateFixed size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
