'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Line, Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Node represents a feature/module in the portal
function FeatureNode({ position, label, color }: { position: [number, number, number], label: string, color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    meshRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0]) * 0.1
    meshRef.current.rotation.y = time * 0.3
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

// Animated connection line between nodes
function Connection({ start, end, progress }: { start: [number, number, number], end: [number, number, number], progress: number }) {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(...start),
      new THREE.Vector3(...end)
    ]
  }, [start, end])

  return (
    <>
      <Line
        points={points}
        color="white"
        lineWidth={1}
        transparent
        opacity={0.2}
      />
      {/* Animated pulse */}
      <mesh position={[
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
        start[2] + (end[2] - start[2]) * progress
      ]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </>
  )
}

// Main workflow visualization
function WorkflowDiagram() {
  const groupRef = useRef<THREE.Group>(null!)
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    groupRef.current.rotation.y = Math.sin(time * 0.2) * 0.3
  })

  // Node positions for workflow
  const nodes = useMemo(() => [
    { pos: [-2, 1, 0] as [number, number, number], label: 'Clients', color: '#ffffff' },
    { pos: [0, 2, 0] as [number, number, number], label: 'Projects', color: '#ffffff' },
    { pos: [2, 1, 0] as [number, number, number], label: 'Proposals', color: '#ffffff' },
    { pos: [2, -1, 0] as [number, number, number], label: 'Invoices', color: '#ffffff' },
    { pos: [0, -2, 0] as [number, number, number], label: 'Documents', color: '#ffffff' },
    { pos: [-2, -1, 0] as [number, number, number], label: 'Reports', color: '#ffffff' },
  ], [])

  // Connections between nodes
  const connections = useMemo(() => [
    { start: nodes[0].pos, end: nodes[1].pos }, // Clients -> Projects
    { start: nodes[1].pos, end: nodes[2].pos }, // Projects -> Proposals
    { start: nodes[2].pos, end: nodes[3].pos }, // Proposals -> Invoices
    { start: nodes[3].pos, end: nodes[4].pos }, // Invoices -> Documents
    { start: nodes[4].pos, end: nodes[5].pos }, // Documents -> Reports
    { start: nodes[5].pos, end: nodes[0].pos }, // Reports -> Clients
    { start: nodes[0].pos, end: nodes[5].pos }, // Cross connections
    { start: nodes[1].pos, end: nodes[4].pos },
  ], [nodes])

  const [progress] = useMemo(() => {
    const p = (Date.now() % 3000) / 3000
    return [p]
  }, [])

  return (
    <group ref={groupRef}>
      {/* Central hub */}
      <mesh position={[0, 0, -1]}>
        <torusGeometry args={[1.5, 0.05, 16, 100]} />
        <meshStandardMaterial 
          color="white"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Feature nodes */}
      {nodes.map((node, i) => (
        <FeatureNode 
          key={i}
          position={node.pos}
          label={node.label}
          color={node.color}
        />
      ))}

      {/* Connections */}
      {connections.map((conn, i) => (
        <Connection 
          key={i}
          start={conn.start}
          end={conn.end}
          progress={progress}
        />
      ))}
    </group>
  )
}

// Data flow particles
function DataParticles() {
  const ref = useRef<THREE.Points>(null!)
  
  const particlesCount = 500
  const positions = useMemo(() => {
    const positions = new Float32Array(particlesCount * 3)
    for (let i = 0; i < particlesCount; i++) {
      const radius = 3 + Math.random() * 2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
    }
    return positions
  }, [])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    ref.current.rotation.y = time * 0.05
  })

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        size={0.02}
        color="white"
        transparent
        opacity={0.2}
        sizeAttenuation
      />
    </Points>
  )
}

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 75 }}
        style={{ background: '#000000' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <WorkflowDiagram />
        <DataParticles />
      </Canvas>
    </div>
  )
}
