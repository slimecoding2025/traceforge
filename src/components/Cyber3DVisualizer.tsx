import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Globe, Activity, Radar, RotateCcw, Play, Pause, Zap, ShieldAlert } from 'lucide-react';
import { Finding } from '../types';
import { sound } from '../lib/soundFx';

interface Cyber3DVisualizerProps {
  findings: Finding[];
  totalEvents: number;
  onSelectFinding?: (findingId: string) => void;
}

export const Cyber3DVisualizer: React.FC<Cyber3DVisualizerProps> = ({
  findings,
  totalEvents,
  onSelectFinding,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'globe' | 'neural' | 'radar'>('globe');
  const [isRotating, setIsRotating] = useState(true);
  const [activeVectorCount, setActiveVectorCount] = useState(0);
  const [criticalFilterOnly, setCriticalFilterOnly] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<{
    ip: string;
    ruleName: string;
    severity: string;
    eventsCount: number;
    x: number;
    y: number;
    findingId: string;
  } | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const interactiveNodesRef = useRef<{ mesh: THREE.Mesh; finding: Finding }[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseVecRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 24);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // Root Group
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    interactiveNodesRef.current = [];

    // --- CENTRAL HOST ENCLAVE (MATRIX GREEN PROTECTED VAULT) ---
    const coreGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // Inner glowing core
    const innerCoreGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x00ff41,
      transparent: true,
      opacity: 0.9,
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    coreMesh.add(innerCore);

    // --- WIREFRAME MATRIX GLOBE RINGS (PHOSPHOR GREEN) ---
    const globeRadius = 8;
    const ringsGroup = new THREE.Group();
    rootGroup.add(ringsGroup);

    // Latitude rings
    for (let i = -2; i <= 2; i++) {
      const ringRad = Math.sqrt(Math.max(0.1, globeRadius * globeRadius - Math.pow(i * 2.5, 2)));
      const ringGeo = new THREE.RingGeometry(ringRad - 0.03, ringRad + 0.03, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = i * 2.5;
      ring.rotation.x = Math.PI / 2;
      ringsGroup.add(ring);
    }

    // Great circle meridians
    const meridianGeo = new THREE.RingGeometry(globeRadius - 0.03, globeRadius + 0.03, 64);
    const meridianMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const meridian1 = new THREE.Mesh(meridianGeo, meridianMat);
    ringsGroup.add(meridian1);

    const meridian2 = new THREE.Mesh(meridianGeo, meridianMat);
    meridian2.rotation.y = Math.PI / 2;
    ringsGroup.add(meridian2);

    // --- PARTICLES BACKGROUND: GREEN MATRIX DUST & RED BREACH SPARKS ---
    const particleCount = 300;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorGreen = new THREE.Color(0x00ff66);
    const colorRed = new THREE.Color(0xff1744);
    const colorEmerald = new THREE.Color(0x10b981);

    for (let i = 0; i < particleCount; i++) {
      const r = 9 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePos[i * 3 + 2] = r * Math.cos(phi);

      // Red sparks for hostile activity, green for matrix space
      const chosenColor = Math.random() > 0.75 ? colorRed : Math.random() > 0.4 ? colorGreen : colorEmerald;
      particleColors[i * 3] = chosenColor.r;
      particleColors[i * 3 + 1] = chosenColor.g;
      particleColors[i * 3 + 2] = chosenColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particleSystem);

    // --- HOSTILE THREAT VECTOR NODES & BLOOD-RED BEZIER ARCS ---
    const sourceFindings = criticalFilterOnly 
      ? findings.filter(f => f.severity === 'critical') 
      : findings;
    const threatItems = sourceFindings.slice(0, 16);
    setActiveVectorCount(threatItems.length);

    threatItems.forEach((finding, idx) => {
      const phi = (idx / Math.max(1, threatItems.length)) * Math.PI * 2 + Math.PI / 6;
      const theta = ((idx % 4) / 4) * Math.PI - Math.PI / 2;
      const dist = globeRadius * 0.95;

      const x = dist * Math.cos(theta) * Math.cos(phi);
      const y = dist * Math.sin(theta);
      const z = dist * Math.cos(theta) * Math.sin(phi);

      const isCritical = finding.severity === 'critical';
      const isHigh = finding.severity === 'high';
      // Red for critical, orange/red for high, green for low/normal
      const nodeColor = isCritical ? 0xff1744 : isHigh ? 0xff5252 : 0x00ff66;

      // Node mesh
      const nodeGeo = new THREE.SphereGeometry(isCritical ? 0.45 : 0.34, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        wireframe: false,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(x, y, z);
      rootGroup.add(nodeMesh);

      // Pulsing outer halo for node
      const haloGeo = new THREE.RingGeometry(0.48, 0.7, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.lookAt(0, 0, 0);
      nodeMesh.add(haloMesh);

      interactiveNodesRef.current.push({ mesh: nodeMesh, finding });

      // Curved attack trajectory bezier arc to the core (0,0,0)
      const start = new THREE.Vector3(x, y, z);
      const end = new THREE.Vector3(0, 0, 0);
      const mid = new THREE.Vector3(
        (x + end.x) / 2 + (Math.random() - 0.5) * 2,
        (y + end.y) / 2 + 2,
        (z + end.z) / 2 + (Math.random() - 0.5) * 2
      );

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(28);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
      const curveMat = new THREE.LineBasicMaterial({
        // Crimson attack beam for critical, green for telemetry flow
        color: isCritical ? 0xff1744 : 0x00ff66,
        transparent: true,
        opacity: isCritical ? 0.75 : 0.35,
        linewidth: isCritical ? 2 : 1,
      });
      const attackBeam = new THREE.Line(curveGeo, curveMat);
      rootGroup.add(attackBeam);
    });

    // --- MOUSE DRAG ROTATION INTERACTION ---
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      // Update normalized mouse for raycasting tooltip
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / height) * 2 + 1;
      mouseVecRef.current.set(mouseX, mouseY);

      if (!isDragging || !rootGroupRef.current) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      rootGroupRef.current.rotation.y += deltaX * 0.005;
      rootGroupRef.current.rotation.x += deltaY * 0.005;

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z = Math.min(
        38,
        Math.max(12, cameraRef.current.position.z + e.deltaY * 0.02)
      );
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // --- ANIMATION LOOP ---
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Enclave spin
      coreMesh.rotation.y = elapsed * 0.4;
      coreMesh.rotation.x = elapsed * 0.2;

      // Auto rotation when enabled
      if (isRotating && rootGroupRef.current && !isDragging) {
        rootGroupRef.current.rotation.y += 0.003;
      }

      // Mode-based camera oscillation
      if (cameraRef.current) {
        if (viewMode === 'radar') {
          cameraRef.current.position.y = 12 + Math.sin(elapsed * 0.5) * 2;
          cameraRef.current.lookAt(0, 0, 0);
        } else if (viewMode === 'neural') {
          particleSystem.rotation.y = elapsed * 0.05;
        }
      }

      // Check node hover with Raycaster
      if (cameraRef.current && interactiveNodesRef.current.length > 0) {
        raycasterRef.current.setFromCamera(mouseVecRef.current, cameraRef.current);
        const meshes = interactiveNodesRef.current.map((n) => n.mesh);
        const intersects = raycasterRef.current.intersectObjects(meshes);

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          const hitItem = interactiveNodesRef.current.find((n) => n.mesh === hitMesh);
          if (hitItem) {
            const screenPos = hitMesh.position.clone();
            if (rootGroupRef.current) screenPos.applyMatrix4(rootGroupRef.current.matrixWorld);
            screenPos.project(cameraRef.current);

            const screenX = ((screenPos.x + 1) / 2) * width;
            const screenY = ((-screenPos.y + 1) / 2) * height;

            setHoveredNode({
              ip: hitItem.finding.source_ip || '192.168.1.104',
              ruleName: hitItem.finding.rule_name,
              severity: hitItem.finding.severity,
              eventsCount: hitItem.finding.evidence_event_ids?.length || hitItem.finding.match_count,
              x: screenX,
              y: screenY,
              findingId: hitItem.finding.finding_id,
            });
          }
        } else {
          setHoveredNode(null);
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Clean up
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [findings, isRotating, viewMode, criticalFilterOnly]);

  const handleSelectHovered = () => {
    if (hoveredNode && onSelectFinding) {
      sound.playSuccess();
      onSelectFinding(hoveredNode.findingId);
    }
  };

  const resetCamera = () => {
    sound.playClick();
    if (cameraRef.current && rootGroupRef.current) {
      cameraRef.current.position.set(0, 5, 24);
      cameraRef.current.lookAt(0, 0, 0);
      rootGroupRef.current.rotation.set(0, 0, 0);
    }
  };

  const toggleRotation = () => {
    sound.playClick();
    setIsRotating(!isRotating);
  };

  return (
    <div className="relative w-full h-[420px] rounded-xl overflow-hidden bg-[#030603] border border-emerald-950/80 shadow-[0_12px_40px_rgba(0,0,0,0.85)] scanlines">
      {/* Top Tactical HUD Header */}
      <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff66]" />
          <div>
            <span className="label-kicker text-emerald-400 block">ENCLAVE DEFENSE MATRIX</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black font-mono tracking-wider text-white">
                3D THREAT VECTOR ORBIT
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600/50">
                {activeVectorCount} VECTORS
              </span>
            </div>
          </div>
        </div>

        {/* Varied Button Sizes: Hero action, Mode toggles, Micro controls */}
        <div className="flex items-center gap-1.5 bg-[#050a05]/90 backdrop-blur-md p-1 rounded-lg border border-emerald-900/40">
          {/* Critical Only Filter Button (Differentiated Red Button) */}
          <button
            onClick={() => {
              sound.playAlert();
              setCriticalFilterOnly(!criticalFilterOnly);
            }}
            className={`btn-tactical-sm flex items-center gap-1.5 rounded transition-all uppercase font-mono ${
              criticalFilterOnly
                ? 'bg-[#ff1744] text-white border border-[#ff1744] shadow-[0_0_15px_rgba(255,23,68,0.5)] font-bold'
                : 'bg-rose-950/30 text-rose-300 border border-rose-800/40 hover:bg-rose-950/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>{criticalFilterOnly ? 'CRITICAL ONLY [ON]' : 'SHOW CRITICAL'}</span>
          </button>

          <div className="w-[1px] h-4 bg-emerald-900/60 mx-1" />

          {/* View Mode Buttons (Differentiated Sizes & Green Highlights) */}
          <button
            onClick={() => {
              sound.playTab();
              setViewMode('globe');
            }}
            className={`btn-tactical-sm flex items-center gap-1.5 rounded transition-all font-mono ${
              viewMode === 'globe'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_12px_rgba(0,255,102,0.3)] font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Sphere</span>
          </button>

          <button
            onClick={() => {
              sound.playTab();
              setViewMode('neural');
            }}
            className={`btn-tactical-sm flex items-center gap-1.5 rounded transition-all font-mono ${
              viewMode === 'neural'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_12px_rgba(0,255,102,0.3)] font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Telemetry</span>
          </button>

          <button
            onClick={() => {
              sound.playTab();
              setViewMode('radar');
            }}
            className={`btn-tactical-sm flex items-center gap-1.5 rounded transition-all font-mono ${
              viewMode === 'radar'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(255,183,3,0.3)] font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Radar</span>
          </button>

          <div className="w-[1px] h-4 bg-emerald-900/60 mx-1" />

          {/* Micro Action Buttons */}
          <button
            onClick={toggleRotation}
            title={isRotating ? 'Pause auto-rotation' : 'Resume auto-rotation'}
            className="btn-micro text-zinc-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-colors"
          >
            {isRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-400" />}
          </button>

          <button
            onClick={resetCamera}
            title="Reset 3D camera orientation"
            className="btn-micro text-zinc-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Hovered Node Tooltip HUD (Black with Red or Green border) */}
      {hoveredNode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            left: `${Math.min(hoveredNode.x + 12, window.innerWidth - 300)}px`,
            top: `${Math.max(hoveredNode.y - 60, 20)}px`,
          }}
          className="absolute z-30 pointer-events-auto bg-[#040804]/95 backdrop-blur-lg border border-emerald-500/60 p-3 rounded-lg shadow-[0_0_24px_rgba(0,255,102,0.3)] min-w-[250px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-emerald-950 pb-1.5 mb-1.5">
            <span className="text-xs font-mono font-bold text-emerald-300">{hoveredNode.ip}</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-black ${
                hoveredNode.severity === 'critical'
                  ? 'bg-[#ff1744] text-white shadow-[0_0_10px_#ff1744]'
                  : hoveredNode.severity === 'high'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {hoveredNode.severity}
            </span>
          </div>

          <p className="text-xs text-zinc-100 font-semibold leading-snug">{hoveredNode.ruleName}</p>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mt-2 pt-1 border-t border-emerald-950">
            <span>{hoveredNode.eventsCount} Events</span>
            {onSelectFinding && (
              <button
                onClick={handleSelectHovered}
                className="text-emerald-400 hover:text-emerald-200 hover:underline font-bold text-xs"
              >
                Inspect Finding &rarr;
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Bottom Telemetry Status HUD */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-[11px] font-mono text-zinc-400 pointer-events-none">
        <div className="flex items-center gap-3 bg-[#020502]/85 backdrop-blur-sm px-3 py-1 rounded border border-emerald-900/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#00ff66]" />
            <span className="text-zinc-200 font-semibold">CORE VAULT: ENCRYPTED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="text-zinc-300">LOGS: {totalEvents.toLocaleString()}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 bg-[#020502]/85 backdrop-blur-sm px-3 py-1 rounded border border-emerald-900/40">
          <span className="text-zinc-400">HOST INTEGRITY: 100%</span>
          <span className="text-emerald-400 font-black">&check; AIR-GAPPED AIRBORNE</span>
        </div>
      </div>
    </div>
  );
};
