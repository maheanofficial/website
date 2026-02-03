import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, MeshDistortMaterial, Float, Sparkles, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Enhanced 3D Microphone with better visibility
const Microphone3D = () => {
    const micRef = useRef<THREE.Group>(null);
    const grilleRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (micRef.current) {
            micRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
            micRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.15;
        }

        if (grilleRef.current) {
            grilleRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <group ref={micRef}>
            {/* Base Platform - Shiny chrome */}
            <mesh position={[0, -2.8, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.5, 0.1, 32]} />
                <meshStandardMaterial
                    color="#1a1a2e"
                    metalness={0.95}
                    roughness={0.05}
                    envMapIntensity={1.5}
                />
            </mesh>

            {/* Microphone Stand - Chrome with gradient */}
            <mesh position={[0, -1.5, 0]}>
                <cylinderGeometry args={[0.08, 0.06, 2.5, 32]} />
                <meshStandardMaterial
                    color="#b794f6"
                    metalness={0.95}
                    roughness={0.1}
                    emissive="#7c3aed"
                    emissiveIntensity={0.3}
                />
            </mesh>

            {/* Lower Microphone Body - Dark with rim light */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.35, 0.3, 0.8, 32]} />
                <meshStandardMaterial
                    color="#2a2a3e"
                    metalness={0.85}
                    roughness={0.15}
                />
            </mesh>

            {/* Mid ring - Accent color */}
            <mesh position={[0, 0.45, 0]}>
                <cylinderGeometry args={[0.37, 0.37, 0.1, 32]} />
                <meshStandardMaterial
                    color="#7c3aed"
                    metalness={0.9}
                    roughness={0.1}
                    emissive="#7c3aed"
                    emissiveIntensity={0.5}
                />
            </mesh>

            {/* Upper Microphone Body - Lighter */}
            <mesh position={[0, 0.8, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.6, 32]} />
                <meshStandardMaterial
                    color="#3a3a4e"
                    metalness={0.85}
                    roughness={0.15}
                />
            </mesh>

            {/* Microphone Grille - Glowing mesh */}
            <mesh ref={grilleRef} position={[0, 1.3, 0]}>
                <sphereGeometry args={[0.42, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <MeshDistortMaterial
                    color="#d946ef"
                    metalness={0.95}
                    roughness={0.05}
                    emissive="#a855f7"
                    emissiveIntensity={0.8}
                    distort={0.2}
                    speed={3}
                    envMapIntensity={2}
                />
            </mesh>

            {/* Inner grille glow */}
            <mesh position={[0, 1.25, 0]}>
                <sphereGeometry args={[0.38, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <meshStandardMaterial
                    color="#ec4899"
                    emissive="#ec4899"
                    emissiveIntensity={1.2}
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* Grille detail lines */}
            {Array.from({ length: 8 }).map((_, i) => (
                <mesh key={i} position={[0, 1.1 + i * 0.05, 0]}>
                    <torusGeometry args={[0.36, 0.01, 8, 32]} />
                    <meshStandardMaterial
                        color="#7c3aed"
                        emissive="#7c3aed"
                        emissiveIntensity={0.5}
                    />
                </mesh>
            ))}

            {/* Top cap - Chrome */}
            <mesh position={[0, 1.6, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial
                    color="#d4d4d8"
                    metalness={0.98}
                    roughness={0.02}
                    envMapIntensity={2}
                />
            </mesh>

            {/* Sparkles around grille */}
            <Sparkles
                count={30}
                scale={[1, 2, 1]}
                size={2}
                speed={0.5}
                opacity={0.8}
                color="#a855f7"
                position={[0, 1.3, 0]}
            />
        </group>
    );
};

// Floating Music Note - Brighter
const MusicNote = ({ position }: { position: [number, number, number] }) => {
    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
            <mesh position={position}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial
                    color="#ec4899"
                    emissive="#ec4899"
                    emissiveIntensity={1.5}
                    metalness={0.5}
                    roughness={0.2}
                />
                <pointLight color="#ec4899" intensity={2} distance={2} />
            </mesh>
        </Float>
    );
};

// Enhanced Audio Wave Bars
const AudioWave = () => {
    const barsRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (barsRef.current) {
            barsRef.current.children.forEach((child, i) => {
                const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + i * 0.5) * 0.8;
                child.scale.y = scale;
            });
        }
    });

    return (
        <group ref={barsRef} position={[0, -1.5, 2.5]}>
            {Array.from({ length: 9 }).map((_, i) => (
                <mesh key={i} position={[(i - 4) * 0.35, 0, 0]}>
                    <boxGeometry args={[0.2, 1.5, 0.2]} />
                    <meshStandardMaterial
                        color="#a855f7"
                        emissive="#7c3aed"
                        emissiveIntensity={1.2}
                        metalness={0.6}
                        roughness={0.2}
                    />
                    <pointLight color="#a855f7" intensity={0.5} distance={1} />
                </mesh>
            ))}
        </group>
    );
};

// Rotating Rings - More visible
const RotatingRings = () => {
    const ringsRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (ringsRef.current) {
            ringsRef.current.rotation.z = state.clock.elapsedTime * 0.15;
        }
    });

    return (
        <group ref={ringsRef}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[2.5, 0.04, 16, 100]} />
                <meshStandardMaterial
                    color="#7c3aed"
                    emissive="#7c3aed"
                    emissiveIntensity={0.8}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[3, 0.04, 16, 100]} />
                <meshStandardMaterial
                    color="#ec4899"
                    emissive="#ec4899"
                    emissiveIntensity={0.8}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[3.5, 0.04, 16, 100]} />
                <meshStandardMaterial
                    color="#d946ef"
                    emissive="#d946ef"
                    emissiveIntensity={0.8}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>
        </group>
    );
};

const Scene3D = () => {
    return (
        <Canvas style={{ width: '100%', height: '100%' }}>
            <PerspectiveCamera makeDefault position={[0, 1, 7]} fov={50} />

            {/* Enhanced Lighting for better microphone visibility */}
            <ambientLight intensity={0.4} />

            {/* Key light - front */}
            <spotLight
                position={[5, 5, 5]}
                intensity={2}
                angle={0.5}
                penumbra={1}
                color="#ffffff"
                castShadow
            />

            {/* Fill light - side */}
            <spotLight
                position={[-5, 3, 3]}
                intensity={1.5}
                angle={0.6}
                penumbra={1}
                color="#a855f7"
            />

            {/* Rim light - back */}
            <spotLight
                position={[0, 5, -5]}
                intensity={1.8}
                angle={0.5}
                penumbra={1}
                color="#ec4899"
            />

            {/* Colored point lights */}
            <pointLight position={[3, 2, 3]} intensity={2} color="#7c3aed" distance={8} />
            <pointLight position={[-3, 2, 3]} intensity={2} color="#ec4899" distance={8} />
            <pointLight position={[0, -2, 2]} intensity={1.5} color="#d946ef" distance={6} />

            {/* Environment map for reflections */}
            <Environment preset="city" />

            {/* 3D Elements */}
            <Microphone3D />
            <AudioWave />
            <RotatingRings />

            {/* Music Notes - Brighter */}
            <MusicNote position={[-2.5, 2, 0]} />
            <MusicNote position={[2.5, -1, 1]} />
            <MusicNote position={[-2, -1.5, 0.5]} />
            <MusicNote position={[2, 2.5, -0.5]} />

            {/* Controls */}
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                maxPolarAngle={Math.PI / 1.8}
                minPolarAngle={Math.PI / 2.5}
                autoRotate
                autoRotateSpeed={1}
                enableDamping
                dampingFactor={0.05}
            />

            {/* Fog for depth */}
            <fog attach="fog" args={['#0a0a1a', 8, 18]} />
        </Canvas>
    );
};

export default Scene3D;
