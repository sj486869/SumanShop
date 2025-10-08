"use client"

import { useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Float, Environment } from "@react-three/drei"
import type * as THREE from "three"

function ProductBox({ isHovered }: { isHovered: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += isHovered ? 0.02 : 0.01
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} scale={isHovered ? 1.2 : 1}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial
          color={isHovered ? "#ff4444" : "#ff3333"}
          metalness={0.8}
          roughness={0.2}
          emissive="#ff0000"
          emissiveIntensity={isHovered ? 0.3 : 0.1}
        />
      </mesh>
    </Float>
  )
}

export function ThreeDProductPreview() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="h-48 w-full cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff3333" />
        <ProductBox isHovered={isHovered} />
        <Environment preset="night" />
      </Canvas>
    </div>
  )
}
