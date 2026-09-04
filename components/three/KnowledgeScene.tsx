"use client";

// KnowledgeScene — BOLD homepage hero 3D layer ("knowledge constellation").
// Three visible layers, PointsMaterial/LineSegments only (no shaders/models):
//   1. drifting starfield of brand particles (big, bright, additive)
//   2. a rigid constellation network — nodes joined by glowing lines that
//      slowly tumbles above the headline
//   3. rising sparks that streak upward through the hero
// Pointer parallax is strong enough to feel. All motion stops when `speed`
// is 0 (reduced-motion users still see the full static composition).

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const FIELD_COLORS = ["#4ec54d", "#4ec54d", "#62d35e", "#ff9133", "#e2e8f0"];
const SPARK_COLORS = ["#62d35e", "#ffb366", "#ffffff"];

function Field({ count, speed }: { count: number; speed: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const hex = FIELD_COLORS.map((h) => new THREE.Color(h));
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = -Math.random() * 5;
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
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + d * 0.35 * speed;
      if (y > 5) y = -5;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    pts.position.x += (state.pointer.x * 0.7 - pts.position.x) * 0.04;
    pts.position.y += (state.pointer.y * 0.4 - pts.position.y) * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.11}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Constellation({ speed }: { speed: number }) {
  const group = useRef<THREE.Group>(null);
  const NODES = 26;

  const { nodePos, linePos, nodeColors } = useMemo(() => {
    // nodes scattered on a loose sphere, joined to their nearest neighbours
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < NODES; i++) {
      const r = 2.4 + Math.random() * 1.4;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      nodes.push(
        new THREE.Vector3(
          r * Math.sin(p) * Math.cos(t) * 1.5,
          r * Math.sin(p) * Math.sin(t) * 0.7,
          r * Math.cos(p) * 0.5,
        ),
      );
    }
    const linePos: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      // connect each node to its two nearest neighbours
      const dists = nodes
        .map((n, j) => ({ j, d: nodes[i].distanceTo(n) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { j } of dists) {
        linePos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
      }
    }
    const nodePos = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => {
      nodePos[i * 3] = n.x;
      nodePos[i * 3 + 1] = n.y;
      nodePos[i * 3 + 2] = n.z;
    });
    const nodeColors = new Float32Array(nodes.length * 3);
    const g = new THREE.Color("#4ec54d");
    const o = new THREE.Color("#ff9133");
    nodes.forEach((_, i) => {
      const c = i % 5 === 0 ? o : g;
      nodeColors[i * 3] = c.r;
      nodeColors[i * 3 + 1] = c.g;
      nodeColors[i * 3 + 2] = c.b;
    });
    return {
      nodePos,
      linePos: new Float32Array(linePos),
      nodeColors,
    };
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(delta, 0.05);
    g.rotation.y += d * 0.12 * speed;
    g.rotation.x = Math.sin(state.clock.elapsedTime * 0.2 * speed) * 0.12;
    g.position.y = 0.6 + Math.sin(state.clock.elapsedTime * 0.4 * speed) * 0.25;
  });

  return (
    <group ref={group} position={[0, 0.6, 1.5]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePos, 3]} />
          <bufferAttribute attach="attributes-color" args={[nodeColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.19}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#4ec54d"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

function Sparks({ count, speed }: { count: number; speed: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = Math.random() * 10 - 5;
      arr[i * 3 + 2] = Math.random() * 3;
    }
    return arr;
  }, [count]);
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const hex = SPARK_COLORS.map((h) => new THREE.Color(h));
    for (let i = 0; i < count; i++) {
      const c = hex[i % hex.length];
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts || speed === 0) return;
    const d = Math.min(delta, 0.05);
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + d * 1.4 * speed;
      if (y > 5.4) {
        y = -5.4;
        pos.setX(i, (Math.random() - 0.5) * 14);
      }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} position={[0, 0, 1.2]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.95}
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
      <Field count={count} speed={speed} />
      <Constellation speed={speed} />
      <Sparks count={Math.max(40, Math.round(count * 0.14))} speed={speed} />
    </Canvas>
  );
}
