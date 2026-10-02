import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

const BlobMesh = ({ color }) => {
  const groupRef = useRef();
  
  // Create a shared material with custom shader injection for the gradient
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.15,
      color: '#E2E2E5'
    });
    
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.bboxMin = { value: -0.8 };
      shader.uniforms.bboxMax = { value: 1.0 };
      shader.uniforms.colorTop = { value: new THREE.Color('#3b82f6') }; // Blue
      shader.uniforms.colorMid = { value: new THREE.Color('#94a3b8') }; // Grey
      shader.uniforms.colorBottom = { value: new THREE.Color('#fde047') }; // Yellow
      shader.uniforms.gradientMix = { value: 0.0 }; // 0 = solid, 1 = gradient

      shader.vertexShader = `
        varying vec3 vWorldPosition;
        ${shader.vertexShader}
      `.replace(
        `#include <worldpos_vertex>`,
        `
        #include <worldpos_vertex>
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader = `
        uniform vec3 colorTop;
        uniform vec3 colorMid;
        uniform vec3 colorBottom;
        uniform float bboxMin;
        uniform float bboxMax;
        uniform float gradientMix;
        varying vec3 vWorldPosition;
        ${shader.fragmentShader}
      `.replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
        float y = clamp((vWorldPosition.y - bboxMin) / (bboxMax - bboxMin), 0.0, 1.0);
        vec3 gradColor;
        if (y < 0.5) {
            gradColor = mix(colorBottom, colorMid, y * 2.0);
        } else {
            gradColor = mix(colorMid, colorTop, (y - 0.5) * 2.0);
        }
        vec3 finalColor = mix(diffuse, gradColor, gradientMix);
        vec4 diffuseColor = vec4( finalColor, opacity );
        `
      );
      
      mat.userData.shader = shader;
    };
    return mat;
  }, []);

  // Determine if we are in the VERY_SCARED (gradient) mood
  const isCrisis = color && color.includes('url');
  const targetSolidColor = new THREE.Color(isCrisis ? '#FFFFFF' : (color || '#E2E2E5'));

  useFrame((state, delta) => {
    // 1. Smoothly transition the base color
    material.color.lerp(targetSolidColor, 0.05);
    
    // 2. Smoothly fade in/out the shader gradient
    if (material.userData.shader) {
      const targetMix = isCrisis ? 1.0 : 0.0;
      const currentMix = material.userData.shader.uniforms.gradientMix.value;
      material.userData.shader.uniforms.gradientMix.value = currentMix + (targetMix - currentMix) * 0.05;
    }
    
    // 3. Breathing effect and subtle rotation
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      const scaleBase = 1.35; // Match the visual size of the previous SVG
      const breath = Math.sin(t * 2) * 0.015;
      
      // Much faster trembling if in crisis mood
      const tremble = isCrisis ? Math.sin(t * 20) * 0.02 : 0;
      
      groupRef.current.scale.set(scaleBase + breath, scaleBase - breath * 0.5, scaleBase + breath);
      groupRef.current.position.x = tremble;
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.08;
      groupRef.current.rotation.z = Math.cos(t * 0.7) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.05, 0]}>
      {/* Main wide blob body (squashed Bao/Modak shape) */}
      <mesh material={material} scale={[1.15, 0.85, 0.7]}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      
      {/* Left top bump */}
      <mesh material={material} position={[-0.22, 0.75, 0]} scale={[1, 0.9, 0.8]}>
        <sphereGeometry args={[0.22, 32, 32]} />
      </mesh>
      
      {/* Right top bump */}
      <mesh material={material} position={[0.22, 0.75, 0]} scale={[1, 0.9, 0.8]}>
        <sphereGeometry args={[0.22, 32, 32]} />
      </mesh>
    </group>
  );
};

export default function Yusa3D({ color }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas shadows camera={{ position: [0, 0, 4.5], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.7} />
        {/* Soft directional lighting for depth */}
        <directionalLight position={[5, 5, 5]} intensity={0.7} castShadow />
        <directionalLight position={[-5, -2, -5]} intensity={0.3} color="#f472b6" />
        <directionalLight position={[0, 5, -5]} intensity={0.2} color="#818cf8" />
        
        <BlobMesh color={color} />
        
        {/* Subtle contact/drop shadow underneath */}
        <ContactShadows 
          position={[0, -1.3, 0]} 
          opacity={0.35} 
          scale={4} 
          blur={2.5} 
          far={3}
          color="#1e293b" 
        />
        
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
