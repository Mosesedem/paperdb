"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Cylinder, Plane } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function PaperSheets() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Gentle floating / breathing animation
    const t = state.clock.getElapsedTime() * 0.4;
    groupRef.current.position.y = Math.sin(t * 1.2) * 0.03;
    groupRef.current.rotation.y = t * 0.08;
  });

  // Create 5–6 paper sheets with slight variations in position/rotation
  const sheets = [];
  for (let i = 0; i < 6; i++) {
    const y = i * 0.08 - 0.2; // stack from bottom to top
    const offsetX = (i % 2 === 0 ? 1 : -1) * 0.02;
    const offsetZ = (i % 3) * 0.015 - 0.02;
    const rotY = (i - 2.5) * 0.06;

    sheets.push(
      <Plane
        key={i}
        args={[0.92, 1.18]} // slightly rectangular like A4 ratio
        position={[offsetX, y, offsetZ]}
        rotation={[0.1, rotY, -0.08]} // subtle paper curl/angle
      >
        <meshPhysicalMaterial
          color="#f8fafc" // very light off-white / paper
          metalness={0.05}
          roughness={0.7}
          clearcoat={0.4}
          clearcoatRoughness={0.1}
          side={THREE.DoubleSide}
        />
      </Plane>,
    );
  }

  return <group ref={groupRef}>{sheets}</group>;
}

function PaperDBLogo() {
  const cylinderRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (cylinderRef.current) {
      cylinderRef.current.rotation.y += 0.0025;
    }
  });

  return (
    <>
      {/* Main cylinder - the "database" */}
      <Cylinder
        ref={cylinderRef}
        args={[0.72, 0.72, 1.1, 64, 1, true]} // open-ended cylinder
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
      >
        <meshPhysicalMaterial
          color="#1e40af" // rich blue – close to PaperDB branding
          metalness={0.85}
          roughness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.0}
          reflectivity={0.9}
          side={THREE.BackSide} // we see inside
        />
      </Cylinder>

      {/* Slightly darker outer rim effect */}
      <Cylinder args={[0.74, 0.74, 1.14, 64, 1, true]} position={[0, 0, 0]}>
        <meshPhysicalMaterial
          color="#1e293b"
          metalness={0.7}
          roughness={0.25}
          transparent
          opacity={0.4}
          side={THREE.FrontSide}
        />
      </Cylinder>

      {/* The paper sheets stack */}
      <PaperSheets />

      {/* Subtle top/bottom caps if you want closed cylinder look */}
      {/* <Plane position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} args={[1.45, 1.45]}>
        <meshPhysicalMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
      </Plane>
      <Plane position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} args={[1.45, 1.45]}>
        <meshPhysicalMaterial color="#1e40af" metalness={0.8} roughness={0.2} />
      </Plane> */}
    </>
  );
}

type Cube3DProps = {
  padding?: number;
};

export default function Cube3D({ padding = 0.08 }: Cube3DProps) {
  // Fit camera nicely around the object
  const modelHeight = 1.1;
  const fov = 45;
  const rad = (fov / 2) * (Math.PI / 180);
  const distance = modelHeight / 2 / Math.tan(rad) / (1 - padding);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        style={{ width: "100%", height: "100%", display: "block" }}
        camera={{
          position: [distance * 0.9, distance * 0.4, distance * 1.1],
          fov,
        }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <spotLight
          position={[6, 12, 8]}
          angle={0.4}
          penumbra={0.9}
          intensity={2.2}
          castShadow
        />
        <directionalLight position={[-8, 6, -5]} intensity={0.7} />

        <PaperDBLogo />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          autoRotate
          autoRotateSpeed={0.8}
        />
      </Canvas>
    </div>
  );
}
