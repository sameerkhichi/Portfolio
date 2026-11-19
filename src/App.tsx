import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AboutOverlay } from './components/AboutOverlay';
import { NeuralNetworkView } from './components/NeuralNetworkView';
import { ProjectCatalogModal } from './components/ProjectCatalogModal';
import { ProjectOverviewPanel } from './components/ProjectOverviewPanel';
import { ABOUT_CORE_ZOOM, useCamera } from './hooks/useCamera';
import { usePinchGesture } from './hooks/usePinchGesture';
import {
  fetchPortfolioData,
  getSeededPortfolioData,
} from './services/githubService';
import type {
  PositionedProjectNode,
  ProfileData,
  ProjectItem,
  ViewMode,
} from './types/portfolio';
import { computeNeuralLayout, computeSynapseEdges } from './utils/layoutEngine';
import { nanotechAudio } from './utils/nanotechAudio';

export function App() {
  const initialSeed = useMemo(() => getSeededPortfolioData(), []);
  const [profile, setProfile] = useState<ProfileData>(initialSeed.profile);
  const [projects, setProjects] = useState<ProjectItem[]>(initialSeed.projects);

  const [viewMode, setViewMode] = useState<ViewMode>('ABOUT_FULLSCREEN');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [generationEpoch, setGenerationEpoch] = useState<number>(0);
  const [aboutPinchProgress, setAboutPinchProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => nanotechAudio.isMuted());
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  const appShellRef = useRef<HTMLDivElement | null>(null);
  const pointerScreenRef = useRef({
    x: viewport.width * 0.5,
    y: viewport.height * 0.5,
    active: false,
  });

  const {
    camera,
    cameraRef,
    velocityRef,
    focusCenter,
    fitNetwork,
    focusNode,
    panByScreenDelta,
    zoomByFactor,
  } = useCamera(ABOUT_CORE_ZOOM);

  // Compute recency-ordered radial layout and dendritic connections
  const nodes = useMemo(() => computeNeuralLayout(projects), [projects]);
  const edges = useMemo(() => computeSynapseEdges(nodes), [nodes]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.project.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  // Hydrate live GitHub profile bio & public repositories
  useEffect(() => {
    let active = true;
    void fetchPortfolioData().then((data) => {
      if (!active) return;
      setProfile(data.profile);
      setProjects(data.projects);
    });
    return () => {
      active = false;
    };
  }, []);

  // Track window viewport resize
  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Unlock Web Audio API on first user gesture
  useEffect(() => {
    const unlockOnce = () => {
      nanotechAudio.unlock();
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
      window.removeEventListener('wheel', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });
    window.addEventListener('wheel', unlockOnce, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
      window.removeEventListener('wheel', unlockOnce);
    };
  }, []);

  const openProjectLibrary = useCallback(() => {
    nanotechAudio.unlock();
    nanotechAudio.playAssembleCascade(Math.min(18, Math.max(10, nodes.length + 5)));
    setSelectedNodeId(null);
    setAboutPinchProgress(0);
    setViewMode('NETWORK');
    setGenerationEpoch((n) => n + 1);
    fitNetwork(nodes, viewport);
  }, [fitNetwork, nodes, viewport]);

  const openAboutMe = useCallback(() => {
    nanotechAudio.unlock();
    nanotechAudio.playZoomTransition('in');
    setSelectedNodeId(null);
    setViewMode('ABOUT_FULLSCREEN');
    focusCenter(ABOUT_CORE_ZOOM);
  }, [focusCenter]);

  const handleSelectNode = useCallback(
    (node: PositionedProjectNode) => {
      nanotechAudio.unlock();
      nanotechAudio.playNodeFocus();
      setSelectedNodeId(node.project.id);
      setViewMode('NODE_PREVIEW');
      focusNode(node, viewport);
    },
    [focusNode, viewport]
  );

  const handleExpandNode = useCallback((node: PositionedProjectNode) => {
    nanotechAudio.unlock();
    nanotechAudio.playZoomTransition('in');
    setSelectedNodeId(node.project.id);
    setViewMode('PROJECT_FULLSCREEN');
  }, []);

  const handleBackFromCatalog = useCallback(() => {
    nanotechAudio.unlock();
    nanotechAudio.playZoomTransition('out');
    setViewMode(selectedNodeId ? 'NODE_PREVIEW' : 'NETWORK');
  }, [selectedNodeId]);

  const handleDeselect = useCallback(() => {
    nanotechAudio.playZoomTransition('out');
    setSelectedNodeId(null);
    setViewMode('NETWORK');
    fitNetwork(nodes, viewport);
  }, [fitNetwork, nodes, viewport]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = nanotechAudio.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  // Keyboard Escape navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (viewMode === 'PROJECT_FULLSCREEN') {
        handleBackFromCatalog();
      } else if (viewMode === 'NODE_PREVIEW') {
        handleDeselect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, handleBackFromCatalog, handleDeselect]);

  // Unified cross-device pinch, wheel zoom & drag-pan gestures
  usePinchGesture({
    containerRef: appShellRef,
    viewMode,
    onPinchOutFromAbout: openProjectLibrary,
    onPinchOutFromCatalog: handleBackFromCatalog,
    onAboutPinchProgress: setAboutPinchProgress,
    onPan: panByScreenDelta,
    onZoom: (factor, clientX, clientY) => {
      const nextZoom = zoomByFactor(factor, clientX, clientY, viewport);
      // If user zooms deeply into the center core while in NETWORK view, smoothly enter About Me
      const distFromCore = Math.hypot(cameraRef.current.x, cameraRef.current.y);
      if (viewMode === 'NETWORK' && nextZoom >= 2.25 && distFromCore < 110) {
        openAboutMe();
      }
    },
    onDraggingChange: setIsDragging,
    onPointerMoveScreen: (x, y) => {
      pointerScreenRef.current = { x, y, active: true };
    },
  });

  return (
    <main ref={appShellRef} className="app-shell">
      <NeuralNetworkView
        profile={profile}
        nodes={nodes}
        edges={edges}
        camera={camera}
        cameraRef={cameraRef}
        velocityRef={velocityRef}
        pointerScreenRef={pointerScreenRef}
        viewport={viewport}
        viewMode={viewMode}
        generationEpoch={generationEpoch}
        selectedNodeId={selectedNodeId}
        isDragging={isDragging}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenAbout={openAboutMe}
        onSelectNode={handleSelectNode}
        onExpandNode={handleExpandNode}
        onDeselect={handleDeselect}
        onZoomIn={() => {
          nanotechAudio.playMovementTick(0.65);
          zoomByFactor(1.22);
        }}
        onZoomOut={() => {
          nanotechAudio.playMovementTick(0.65);
          zoomByFactor(0.82);
        }}
        onFitAll={() => {
          nanotechAudio.playAssembleCascade(8);
          setSelectedNodeId(null);
          setViewMode('NETWORK');
          fitNetwork(nodes, viewport);
        }}
      />

      <AboutOverlay
        profile={profile}
        projectCount={nodes.length}
        visible={viewMode === 'ABOUT_FULLSCREEN'}
        pinchProgress={aboutPinchProgress}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenProjectLibrary={openProjectLibrary}
      />

      {viewMode === 'NODE_PREVIEW' && selectedNode && (
        <ProjectOverviewPanel
          node={selectedNode}
          onExpandFull={() => handleExpandNode(selectedNode)}
          onClose={handleDeselect}
        />
      )}

      {viewMode === 'PROJECT_FULLSCREEN' && selectedNode && (
        <ProjectCatalogModal
          node={selectedNode}
          onBackToNetwork={handleBackFromCatalog}
          onOpenAbout={openAboutMe}
        />
      )}
    </main>
  );
}
export default App;
