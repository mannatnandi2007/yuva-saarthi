import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Yusa3D — True 3D Modak Character plotted entirely in Three.js
 * Features:
 * - 100% Three.js 3D geometry (body, Modak peak, 3D eyes with specular gleams, 3D blush, 3D smile/frown, 3D sparkle stars)
 * - Window-level cursor tilt tracking (eyes, smile, and head rotate together in authentic 3D perspective)
 * - Safe camera distance (z = 4.4, fov = 38) to guarantee zero edge/corner viewport clipping
 * - Smooth Three.js transparent ground shadow circle with zero WebGL bounding-box artifacts
 * - Solid vibrant colors only (no gradients)
 */
function YusaModel({ color = '#f472b6', mood = 'HAPPY' }) {
  const groupRef = useRef();
  const leftStarRef = useRef();
  const rightStarRef = useRef();
  const mouthRef = useRef();
  const mousePos = useRef({ x: 0, y: 0 });

  // Window cursor listener for interactive 3D perspective tracking
  useEffect(() => {
    const handlePointerMove = (e) => {
      mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  const targetColor = useMemo(() => new THREE.Color(color || '#f472b6'), [color]);

  // Materials
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: targetColor,
      roughness: 0.32,
      metalness: 0.05,
    });
  }, [targetColor]);

  const eyeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2e1065'), // Deep plum
      roughness: 0.15,
      metalness: 0.12,
    });
  }, []);

  const gleamMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff'),
    });
  }, []);

  const blushMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f472b6'),
      roughness: 0.6,
      transparent: true,
      opacity: 0.85,
    });
  }, []);

  const mouthMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#be185d'),
      roughness: 0.3,
      metalness: 0.05,
    });
  }, []);

  const starMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c084fc'),
      roughness: 0.25,
      metalness: 0.2,
      emissive: new THREE.Color('#9333ea'),
      emissiveIntensity: 0.35,
    });
  }, []);

  const isSad = mood === 'SAD' || mood === 'TIRED';
  const isAnxious = mood === 'ANXIOUS' || mood === 'SCARED' || mood === 'VERY_SCARED';

  useFrame((state) => {
    if (bodyMaterial) {
      bodyMaterial.color.lerp(targetColor, 0.08);
    }

    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      const breath = Math.sin(t * 2.4) * 0.016;

      // Subtle cheerful idle chitter/wiggle in 3D space
      const idleWiggle = Math.sin(t * 3.6) * 0.05;
      const idleBounce = Math.abs(Math.sin(t * 3.2)) * 0.035;

      // Cursor tilt combined with gentle organic breathing and wiggle
      const targetRotY = (mousePos.current.x * 0.34) + idleWiggle;
      const targetRotX = (-mousePos.current.y * 0.20) + Math.cos(t * 0.7) * 0.02;
      const targetRotZ = idleWiggle * 0.5;

      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.08);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.08);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, 0.08);

      // Gentle floating bob + joyful micro-bounce
      groupRef.current.position.y = -0.02 + Math.sin(t * 2.2) * 0.032 + idleBounce;

      const baseScale = 0.88;
      groupRef.current.scale.set(baseScale + breath, baseScale - breath * 0.5, baseScale + breath);
    }

    // Sparkles spin
    if (leftStarRef.current && rightStarRef.current) {
      const t = state.clock.getElapsedTime();
      leftStarRef.current.rotation.z = t * 0.8;
      rightStarRef.current.rotation.z = -t * 0.7;
    }

    // Mood mouth expression lerp
    if (mouthRef.current) {
      const targetMouthRotX = isSad ? Math.PI * 0.08 : (isAnxious ? Math.PI * 0.5 : Math.PI * 0.94);
      const targetMouthPosY = isSad ? -0.19 : -0.14;
      mouthRef.current.rotation.x = THREE.MathUtils.lerp(mouthRef.current.rotation.x, targetMouthRotX, 0.1);
      mouthRef.current.position.y = THREE.MathUtils.lerp(mouthRef.current.position.y, targetMouthPosY, 0.1);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.02, 0]}>
      {/* 1. Main squashed Bao / Modak body */}
      <mesh material={bodyMaterial} scale={[1.12, 0.86, 0.76]}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>

      {/* 2. Signature Modak crest tip */}
      <mesh material={bodyMaterial} position={[0, 0.76, 0]} scale={[0.42, 0.44, 0.34]}>
        <coneGeometry args={[0.5, 0.88, 32]} />
      </mesh>

      {/* 3. Left and Right top cheek bumps */}
      <mesh material={bodyMaterial} position={[-0.24, 0.68, 0]} scale={[1, 0.86, 0.78]}>
        <sphereGeometry args={[0.2, 32, 32]} />
      </mesh>
      <mesh material={bodyMaterial} position={[0.24, 0.68, 0]} scale={[1, 0.86, 0.78]}>
        <sphereGeometry args={[0.2, 32, 32]} />
      </mesh>

      {/* 4. Left 3D Eye with specular gleams */}
      <group position={[-0.29, 0.08, 0.67]} rotation={[0, -0.14, 0]}>
        {/* Eye Base */}
        <mesh material={eyeMaterial} scale={[0.13, 0.18, 0.06]}>
          <sphereGeometry args={[1, 32, 32]} />
        </mesh>
        {/* Main upper gleam */}
        <mesh material={gleamMaterial} position={[0.038, 0.065, 0.05]} scale={[0.045, 0.05, 0.02]}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
        {/* Secondary lower gleam */}
        <mesh material={gleamMaterial} position={[-0.038, -0.045, 0.05]} scale={[0.025, 0.028, 0.015]}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
      </group>

      {/* 5. Right 3D Eye with specular gleams */}
      <group position={[0.29, 0.08, 0.67]} rotation={[0, 0.14, 0]}>
        {/* Eye Base */}
        <mesh material={eyeMaterial} scale={[0.13, 0.18, 0.06]}>
          <sphereGeometry args={[1, 32, 32]} />
        </mesh>
        {/* Main upper gleam */}
        <mesh material={gleamMaterial} position={[0.038, 0.065, 0.05]} scale={[0.045, 0.05, 0.02]}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
        {/* Secondary lower gleam */}
        <mesh material={gleamMaterial} position={[-0.038, -0.045, 0.05]} scale={[0.025, 0.028, 0.015]}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
      </group>

      {/* 6. 3D Rosy Cheeks (Blush) */}
      <mesh material={blushMaterial} position={[-0.48, -0.06, 0.58]} scale={[0.14, 0.075, 0.04]}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>
      <mesh material={blushMaterial} position={[0.48, -0.06, 0.58]} scale={[0.14, 0.075, 0.04]}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* 7. 3D Happy/Responsive Modak Smile */}
      <mesh ref={mouthRef} material={mouthMaterial} position={[0, -0.14, 0.69]} rotation={[Math.PI * 0.94, 0, 0]} scale={[0.15, 0.11, 0.05]}>
        <torusGeometry args={[0.48, 0.18, 16, 32, Math.PI]} />
      </mesh>

      {/* 8. 3D Floating Sparkle Stars */}
      <mesh ref={leftStarRef} material={starMaterial} position={[-0.78, 0.38, 0.22]} scale={[0.075, 0.075, 0.04]}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
      <mesh ref={rightStarRef} material={starMaterial} position={[0.78, 0.42, 0.20]} scale={[0.07, 0.07, 0.04]}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>

      {/* 9. Soft Circular Ground Shadow (No clipping or box artifacts) */}
      <mesh position={[0, -0.92, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.1, 0.72, 1]}>
        <circleGeometry args={[0.82, 48]} />
        <meshBasicMaterial color="#db2777" transparent opacity={0.15} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Yusa3D({ color = '#ec4899', mood = 'HAPPY' }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas 
        camera={{ position: [0, 0, 4.4], fov: 38 }} 
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={0.9} />
        {/* Soft directional lighting for rich 3D shading */}
        <directionalLight position={[4, 5, 4]} intensity={1.15} />
        <directionalLight position={[-4, -1, 3]} intensity={0.45} color="#f472b6" />
        <directionalLight position={[0, 4, -4]} intensity={0.3} color="#a855f7" />

        {/* 100% Three.js Plotted Yusa Model */}
        <YusaModel color={color} mood={mood} />
      </Canvas>
    </div>
  );
}
