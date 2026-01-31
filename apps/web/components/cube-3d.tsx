// "use client";

// import { Canvas, useFrame } from "@react-three/fiber";
// import { OrbitControls, Cylinder, Svg } from "@react-three/drei";
// import { useRef } from "react";
// import * as THREE from "three";

// /**
//  * Renders the Lucide Database Icon as a 3D SVG element
//  */
// function DatabaseIcon() {
//   const groupRef = useRef<THREE.Group | null>(null);

//   useFrame((state) => {
//     if (!groupRef.current) return;
//     const t = state.clock.getElapsedTime();
//     // Smooth floating animation
//     groupRef.current.position.y = Math.sin(t * 1.5) * 0.05;
//     // Subtle tilt
//     groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
//   });

//   return (
//     <group ref={groupRef} scale={0.015} rotation={[0, 0, Math.PI]}>
//       <Svg
//         // Lucide Database Path Data
//         src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><ellipse cx='12' cy='5' rx='9' ry='3'/><path d='M3 5V19A9 3 0 0 0 21 19V5'/><path d='M3 12A9 3 0 0 0 21 12'/></svg>"
//         position={[-12, 12, 0]} // Center the icon based on viewbox
//         material={
//           new THREE.MeshPhysicalMaterial({
//             color: "#ffffff",
//             emissive: "#60a5fa",
//             emissiveIntensity: 0.5,
//             side: THREE.DoubleSide,
//             envMapIntensity: 0,
//           })
//         }
//       />
//     </group>
//   );
// }

// function PaperDBLogo() {
//   const cylinderRef = useRef<THREE.Mesh | null>(null);

//   useFrame(() => {
//     if (cylinderRef.current) {
//       cylinderRef.current.rotation.y += 0.0025;
//     }
//   });

//   return (
//     <>
//       <Cylinder
//         ref={cylinderRef}
//         args={[0.72, 0.72, 1.1, 64, 1, true]}
//         position={[0, 0, 0]}
//       >
//         <meshPhysicalMaterial
//           color="#1e40af"
//           metalness={0.85}
//           roughness={0.15}
//           clearcoat={1}
//           side={THREE.BackSide}
//           envMapIntensity={0}
//         />
//       </Cylinder>

//       {/* Outer Shell */}
//       <Cylinder args={[0.74, 0.74, 1.14, 64, 1, true]} position={[0, 0, 0]}>
//         <meshPhysicalMaterial
//           color="#1e293b"
//           metalness={0.7}
//           roughness={0.25}
//           transparent
//           opacity={0.3}
//           side={THREE.FrontSide}
//           envMapIntensity={0}
//         />
//       </Cylinder>

//       {/* Replaced PaperSheets with DatabaseIcon */}
//       <DatabaseIcon />
//     </>
//   );
// }

// export default function Cube3D({ padding = 0.08 }) {
//   const fov = 45;
//   const distance =
//     1.1 / 2 / Math.tan((fov / 2) * (Math.PI / 180)) / (1 - padding);

//   return (
//     <div style={{ width: "100%", height: "100%" }}>
//       <Canvas
//         camera={{
//           position: [distance * 0.9, distance * 0.4, distance * 1.1],
//           fov,
//         }}
//         gl={{ antialias: true }}
//       >
//         <ambientLight intensity={0.8} />
//         <pointLight position={[5, 5, 5]} intensity={1.5} />
//         <spotLight position={[-5, 5, 0]} intensity={1} color="#3b82f6" />

//         <PaperDBLogo />

//         <OrbitControls
//           enableZoom={false}
//           enablePan={false}
//           autoRotate
//           autoRotateSpeed={1.2}
//         />
//       </Canvas>
//     </div>
//   );
// }

"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Plane, Html } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { Database } from "lucide-react";

function PaperSheets() {
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    // Gentle floating / breathing animation
    const t = state.clock.getElapsedTime() * 0.4;
    group.position.y = Math.sin(t * 1.2) * 0.03;
    group.rotation.y = t * 0.08;
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
        args={[0.8, 1.0]}
        position={[offsetX, y, offsetZ]}
        rotation={[0, rotY, 0]}
      >
        <meshStandardMaterial
          color="#f5f5f5"
          side={THREE.DoubleSide}
          envMapIntensity={0}
        />
      </Plane>,
    );
  }

  return <group ref={groupRef}>{sheets}</group>;
}

function PaperDBLogo() {
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    group.rotation.y += 0.0025;
  });

  return (
    <group ref={groupRef}>
      {/* The paper sheets stack */}
      <PaperSheets />

      {/* Database icon overlay using HTML */}
      <Html
        center
        position={[0, 0, 0.45]}
        transform
        distanceFactor={1.5}
        style={{
          pointerEvents: "none",
        }}
      >
        <div className="flex items-center justify-center">
          <Database
            size={120}
            strokeWidth={1.5}
            className="text-blue-600 drop-shadow-lg"
          />
        </div>
      </Html>
    </group>
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
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, distance], fov }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <PaperDBLogo />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
        <Environment preset="apartment" />
      </Canvas>
    </div>
  );
}
