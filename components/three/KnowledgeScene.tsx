"use client";

// KnowledgeScene — the homepage hero 3D layer ("knowledge constellation").
// PointsMaterial only (no shaders, no models, no postprocessing) per the
// three.js plan: subtle drifting brand particles behind the hero copy.

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const PALETTE = ["#4ec54d", "#4ec54d", "#4ec54d", "#ff9133", "#e2e8f0"];

function Particles({ count, speed }: { count: number; speed: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const hex = PALETTE.map((h) => new THREE.Color(h));
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9.5;
      positions[i * 3 + 2] = -Math.random() * 4;
      const c = hex[i % hex.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts || speed === 0) return;
    const d = Math.min(delta, 0.05);
    pts.rotation.y += d * 0.02 * speed;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + d * 0.12 * speed;
      if (y > 4.8) y = -4.8;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    // gentle pointer parallax
    pts.position.x += (state.pointer.x * 0.35 - pts.position.x) * 0.03;
    pts.position.y += (state.pointer.y * 0.2 - pts.position.y) * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function KnowledgeScene({
  paused,
  speed,
  count,
}: {
  paused: boolean;
  speed: number;
  count: number;
}) {
  return (
    <Canvas
      frameloop={paused ? "never" : "always"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Particles count={count} speed={speed} />
    </Canvas>
  );
}
