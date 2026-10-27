import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MOOD_CONFIG = {
  NORMAL:     { color: '#ffe4e6', eye: 'open', browL: 0, browR: 0, browY: 1.0, mouth: 'normal', blush: 0, accent: 'none' },
  HAPPY:      { color: '#ff9ebd', eye: 'happy', browL: 0, browR: 0, browY: 1.0, mouth: 'happy', blush: 1, accent: 'none' },
  OVERJOYED:  { color: '#ff4d6d', eye: 'starry', browL: 0, browR: 0, browY: 1.0, mouth: 'overjoyed', blush: 1, accent: 'sparkle' },
  SAD:        { color: '#93c5fd', eye: 'open', browL: 0.35, browR: -0.35, browY: 0.32, mouth: 'sad', blush: 0, accent: 'tears' },
  ANGRY:      { color: '#ef4444', eye: 'open', browL: -0.785, browR: 0.785, browY: 0.28, mouth: 'angry', blush: 0, accent: 'anger' },
  ANXIOUS:    { color: '#fb923c', eye: 'open', browL: 0.2, browR: -0.2, browY: 0.36, mouth: 'anxious', blush: 0, accent: 'sweat' },
  SCARED:     { color: '#7d8fa3', eye: 'open', browL: 0.3, browR: -0.3, browY: 0.32, mouth: 'scared', blush: 0, accent: 'tremble' },
  LONELY:     { color: '#ff9ebd', eye: 'open', browL: 0.3, browR: -0.3, browY: 0.32, mouth: 'sad', blush: 0, accent: 'none' },
  TIRED:      { color: '#a8a2b5', eye: 'open', browL: 0, browR: 0, browY: 0.22, mouth: 'tired', blush: 0, accent: 'z' },
  CONFUSED:   { color: '#fbbf24', eye: 'open', browL: -0.3, browR: -0.3, browY: 0.30, mouth: 'confused', blush: 0, accent: 'question' },
  VERY_SCARED:{ color: '#7d8fa3', eye: 'open', browL: 0.3, browR: -0.3, browY: 0.32, mouth: 'scared', blush: 0, accent: 'tremble' },
  CHITTER:    { color: '#ff4d6d', eye: 'happy', browL: 0, browR: 0, browY: 1.0, mouth: 'happy', blush: 1, accent: 'sparkle' },
};

function getMoodConfig(mood) {
  return MOOD_CONFIG[mood] || MOOD_CONFIG.NORMAL;
}

function createCushionShape() {
  const shape = new THREE.Shape();
  const w = 0.55;
  const h = 0.45;
  const r = 0.2;
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

function lerpScale(ref, target, speed) {
  if (ref.current) {
    const s = THREE.MathUtils.lerp(ref.current.scale.x, target, speed);
    ref.current.scale.set(s, s, s);
  }
}

const mats = {
  white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }),
  faintWhite: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, transparent: true, opacity: 0.35 }),
  black: new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.3 }),
  red: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.3 }),
  star: new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.2 }),
  orange: new THREE.MeshStandardMaterial({ color: '#fb923c', roughness: 0.2 }),
  blue: new THREE.MeshStandardMaterial({ color: '#60a5fa', roughness: 0.2 }),
  grey: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.3 }),
  blush: new THREE.MeshStandardMaterial({ color: '#ff4d6d', roughness: 0.5, transparent: true, opacity: 0 }),
};

function YusaEye({ position, typeRef }) {
  const openGrp = useRef();
  const happyGrp = useRef();
  const starryGrp = useRef();

  const starShape = useMemo(() => {
    const s = new THREE.Shape();
    const outR = 0.12; const inR = 0.05;
    for(let i=0; i<8; i++) {
      const r = i%2===0 ? outR : inR;
      const a = (i/8)*Math.PI*2;
      if(i===0) s.moveTo(Math.cos(a)*r, Math.sin(a)*r);
      else s.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    return s;
  }, []);

  useFrame(() => {
    const t = typeRef.current;
    const spd = 0.15;
    lerpScale(openGrp, t === 'open' ? 1 : 0.001, spd);
    lerpScale(happyGrp, t === 'happy' ? 1 : 0.001, spd);
    lerpScale(starryGrp, t === 'starry' ? 1 : 0.001, spd);
  });

  return (
    <group position={position}>
      <group ref={openGrp} scale={0.001}>
        <mesh material={mats.black} scale={[0.16, 0.22, 0.04]}>
          <sphereGeometry args={[1, 32, 32]} />
        </mesh>
        <mesh material={mats.white} position={[-0.04, 0.08, 0.035]} scale={[0.045, 0.06, 0.015]}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
        <mesh material={mats.white} position={[0.05, -0.06, 0.035]} scale={[0.025, 0.025, 0.015]}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
      </group>

      <group ref={happyGrp} scale={0.001} position={[0, 0.04, 0.02]}>
        <mesh material={mats.black} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.12, 0.035, 16, 32, Math.PI]} />
        </mesh>
      </group>

      <group ref={starryGrp} scale={0.001}>
        <mesh material={mats.black} scale={[0.16, 0.22, 0.04]}>
          <sphereGeometry args={[1, 32, 32]} />
        </mesh>
        <mesh material={mats.star} position={[0, 0, 0.03]} rotation={[0, 0, Math.PI/4]}>
          <extrudeGeometry args={[starShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005 }]} />
        </mesh>
      </group>
    </group>
  );
}

function YusaMouth({ mouthRef }) {
  const normalGrp = useRef();
  const happyGrp = useRef();
  const overjoyedGrp = useRef();
  const angryGrp = useRef();
  const sadGrp = useRef();
  const anxiousGrp = useRef();
  const scaredGrp = useRef();
  const tiredGrp = useRef();
  const confusedGrp = useRef();

  useFrame(() => {
    const m = mouthRef.current;
    const spd = 0.2;
    lerpScale(normalGrp, m === 'normal' ? 1 : 0.001, spd);
    lerpScale(happyGrp, m === 'happy' ? 1 : 0.001, spd);
    lerpScale(overjoyedGrp, m === 'overjoyed' ? 1 : 0.001, spd);
    lerpScale(angryGrp, m === 'angry' ? 1 : 0.001, spd);
    lerpScale(sadGrp, m === 'sad' ? 1 : 0.001, spd);
    lerpScale(anxiousGrp, m === 'anxious' ? 1 : 0.001, spd);
    lerpScale(scaredGrp, m === 'scared' ? 1 : 0.001, spd);
    lerpScale(tiredGrp, m === 'tired' ? 1 : 0.001, spd);
    lerpScale(confusedGrp, m === 'confused' ? 1 : 0.001, spd);
  });

  return (
    <group position={[0, -0.22, 0.48]}>
      {/* 1. Normal */}
      <group ref={normalGrp} scale={0.001}>
        <mesh material={mats.white} scale={[0.26, 0.15, 0.08]}><sphereGeometry args={[1, 32, 32]}/></mesh>
        <mesh material={mats.red} position={[0, -0.06, 0.06]} scale={[0.1, 0.08, 0.04]}>
          <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
      </group>

      {/* 2. Happy */}
      <group ref={happyGrp} scale={0.001}>
        <mesh material={mats.white} scale={[0.26, 0.15, 0.08]}><sphereGeometry args={[1, 32, 32]}/></mesh>
        <mesh material={mats.red} position={[0, -0.02, 0.06]} scale={[0.16, 0.12, 0.04]}>
          <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
      </group>

      {/* 3. Overjoyed (Big wide open mouth) */}
      <group ref={overjoyedGrp} scale={0.001}>
        <mesh material={mats.white} scale={[0.22, 0.2, 0.08]} position={[0, -0.02, 0]}>
          <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
        <mesh material={mats.red} position={[0, -0.1, 0.06]} scale={[0.12, 0.08, 0.04]}>
          <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
      </group>

      {/* 4. Angry (Clenched teeth) */}
      <group ref={angryGrp} scale={0.001} position={[0, -0.02, 0]}>
        <mesh material={mats.white} scale={[0.18, 0.08, 0.08]} position={[0, 0, 0]}>
          <sphereGeometry args={[1, 32, 32]} />
        </mesh>
        <mesh material={mats.black} scale={[0.16, 0.015, 0.09]} position={[0, 0, 0]}>
          <boxGeometry />
        </mesh>
      </group>

      {/* 5. Sad / Lonely */}
      <group ref={sadGrp} scale={0.001} position={[0, -0.02, 0]}>
        <mesh material={mats.faintWhite} scale={[0.2, 0.1, 0.08]}><sphereGeometry args={[1, 16, 16]}/></mesh>
        <mesh material={mats.black} position={[0, -0.02, 0.08]} rotation={[0, 0, Math.PI * 0.1]}>
          <torusGeometry args={[0.06, 0.02, 16, 32, Math.PI * 0.8]} />
        </mesh>
      </group>

      {/* 6. Anxious (gasp) */}
      <group ref={anxiousGrp} scale={0.001} position={[0, -0.02, 0]}>
        <mesh material={mats.faintWhite} scale={[0.2, 0.1, 0.08]}><sphereGeometry args={[1, 16, 16]}/></mesh>
        <mesh material={mats.black} scale={[0.04, 0.06, 0.08]} position={[0, 0, 0.04]}><sphereGeometry /></mesh>
      </group>

      {/* 7. Scared */}
      <group ref={scaredGrp} scale={0.001} position={[0, -0.02, 0]}>
        <mesh material={mats.faintWhite} scale={[0.2, 0.1, 0.08]}><sphereGeometry args={[1, 16, 16]}/></mesh>
        <mesh material={mats.black} scale={[0.08, 0.04, 0.08]} position={[0, 0, 0.04]}><sphereGeometry /></mesh>
      </group>

      {/* 8. Tired */}
      <group ref={tiredGrp} scale={0.001} position={[0, -0.02, 0]}>
        <mesh material={mats.faintWhite} scale={[0.2, 0.1, 0.08]}><sphereGeometry args={[1, 16, 16]}/></mesh>
        <mesh material={mats.black} scale={[0.08, 0.015, 0.08]} position={[0, 0, 0.04]}><boxGeometry /></mesh>
      </group>

      {/* 9. Confused */}
      <group ref={confusedGrp} scale={0.001} position={[0, -0.02, 0]}>
        <mesh material={mats.faintWhite} scale={[0.2, 0.1, 0.08]}><sphereGeometry args={[1, 16, 16]}/></mesh>
        <mesh material={mats.black} scale={[0.04, 0.015, 0.08]} position={[-0.03, 0.01, 0.04]} rotation={[0, 0, 0.4]}><boxGeometry/></mesh>
        <mesh material={mats.black} scale={[0.04, 0.015, 0.08]} position={[0.03, -0.01, 0.04]} rotation={[0, 0, -0.4]}><boxGeometry/></mesh>
      </group>
    </group>
  );
}

function Accents({ accentRef }) {
  const tearsGrp = useRef();
  const angerGrp = useRef();
  const sweatGrp = useRef();
  const zGrp = useRef();
  const questionGrp = useRef();
  const sparkleGrp = useRef();
  const trembleGrp = useRef();

  const starShape = useMemo(() => {
    const s = new THREE.Shape();
    const outR = 1; const inR = 0.4;
    for(let i=0; i<8; i++) {
      const r = i%2===0 ? outR : inR;
      const a = (i/8)*Math.PI*2;
      if(i===0) s.moveTo(Math.cos(a)*r, Math.sin(a)*r);
      else s.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    return s;
  }, []);

  useFrame((state) => {
    const a = accentRef.current;
    const spd = 0.15;
    const t = state.clock.getElapsedTime();

    lerpScale(tearsGrp, a === 'tears' ? 1 : 0.001, spd);
    lerpScale(angerGrp, a === 'anger' ? 1 : 0.001, spd);
    lerpScale(sweatGrp, a === 'sweat' ? 1 : 0.001, spd);
    lerpScale(zGrp, a === 'z' ? 1 : 0.001, spd);
    lerpScale(questionGrp, a === 'question' ? 1 : 0.001, spd);
    lerpScale(sparkleGrp, a === 'sparkle' ? 1 : 0.001, spd);
    lerpScale(trembleGrp, a === 'tremble' ? 1 : 0.001, spd);

    if (a === 'tears' && tearsGrp.current) {
      tearsGrp.current.position.y = Math.sin(t * 3) * 0.02;
    }
    if (a === 'anger' && angerGrp.current) {
      angerGrp.current.scale.x = 1 + Math.sin(t * 8) * 0.1;
      angerGrp.current.scale.y = 1 + Math.sin(t * 8) * 0.1;
    }
    if (a === 'sweat' && sweatGrp.current) {
      sweatGrp.current.position.y = Math.sin(t * 4) * 0.03;
    }
    if (a === 'z' && zGrp.current) {
      zGrp.current.position.y = Math.sin(t * 2) * 0.05 + 0.1;
      zGrp.current.position.x = Math.sin(t * 1) * 0.05;
    }
    if (a === 'sparkle' && sparkleGrp.current) {
      sparkleGrp.current.rotation.z = t * 1.5;
      sparkleGrp.current.scale.x = 1 + Math.sin(t * 6) * 0.2;
      sparkleGrp.current.scale.y = 1 + Math.sin(t * 6) * 0.2;
    }
    if (a === 'tremble' && trembleGrp.current) {
      trembleGrp.current.position.x = Math.sin(t * 30) * 0.02;
    }
  });

  return (
    <group>
      <group ref={tearsGrp} scale={0.001}>
        <mesh position={[-0.26, 0.05, 0.58]} scale={[0.04, 0.08, 0.04]} material={mats.blue}><sphereGeometry args={[1, 16, 16]}/></mesh>
        <mesh position={[0.26, 0.05, 0.58]} scale={[0.04, 0.08, 0.04]} material={mats.blue}><sphereGeometry args={[1, 16, 16]}/></mesh>
      </group>

      <group ref={angerGrp} scale={0.001} position={[0.45, 0.65, 0.3]} rotation={[0, 0, 0.2]}>
        <mesh position={[-0.05, 0, 0]} scale={[0.02, 0.15, 0.02]} material={mats.red}><boxGeometry/></mesh>
        <mesh position={[0.05, 0, 0]} scale={[0.02, 0.15, 0.02]} material={mats.red}><boxGeometry/></mesh>
        <mesh position={[0, -0.05, 0]} scale={[0.15, 0.02, 0.02]} material={mats.red}><boxGeometry/></mesh>
        <mesh position={[0, 0.05, 0]} scale={[0.15, 0.02, 0.02]} material={mats.red}><boxGeometry/></mesh>
      </group>

      <group ref={sweatGrp} scale={0.001} position={[-0.55, 0.55, 0.3]}>
        <mesh material={mats.orange} scale={[0.04, 0.12, 0.04]} rotation={[0,0,-0.3]}><sphereGeometry/></mesh>
        <mesh material={mats.orange} position={[-0.15, -0.05, 0]} scale={[0.03, 0.09, 0.03]} rotation={[0,0,-0.4]}><sphereGeometry/></mesh>
        <mesh material={mats.orange} position={[0.15, -0.05, 0]} scale={[0.03, 0.09, 0.03]} rotation={[0,0,-0.2]}><sphereGeometry/></mesh>
      </group>

      <group ref={zGrp} scale={0.001} position={[0.5, 0.65, 0.2]}>
        <mesh position={[0, 0.12, 0]} scale={[0.15, 0.03, 0.03]} material={mats.grey}><boxGeometry/></mesh>
        <mesh position={[0, 0, 0]} rotation={[0, 0, -0.8]} scale={[0.2, 0.03, 0.03]} material={mats.grey}><boxGeometry/></mesh>
        <mesh position={[0, -0.12, 0]} scale={[0.15, 0.03, 0.03]} material={mats.grey}><boxGeometry/></mesh>
      </group>

      <group ref={questionGrp} scale={0.001} position={[0.5, 0.65, 0.2]}>
        <mesh position={[0, 0.1, 0]} material={mats.star}>
          <torusGeometry args={[0.08, 0.025, 16, 32, Math.PI * 1.3]} />
        </mesh>
        <mesh position={[0.05, 0.0, 0]} rotation={[0, 0, 0.5]} scale={[0.025, 0.1, 0.025]} material={mats.star}>
          <boxGeometry />
        </mesh>
        <mesh position={[0.03, -0.1, 0]} scale={[0.04, 0.04, 0.04]} material={mats.star}>
          <sphereGeometry />
        </mesh>
      </group>

      <group ref={sparkleGrp} scale={0.001}>
        <mesh position={[0.5, 0.65, 0.2]} material={mats.star} scale={[0.1, 0.1, 0.1]}>
           <extrudeGeometry args={[starShape, { depth: 0.1 }]} />
        </mesh>
        <mesh position={[0.65, 0.5, 0.2]} material={mats.star} scale={[0.07, 0.07, 0.07]}>
           <extrudeGeometry args={[starShape, { depth: 0.1 }]} />
        </mesh>
      </group>

      <group ref={trembleGrp} scale={0.001}>
        <mesh position={[-0.6, 0.2, 0.2]} rotation={[0, 0, 0.2]} scale={[0.02, 0.15, 0.02]} material={mats.blue}><boxGeometry/></mesh>
        <mesh position={[-0.65, 0.1, 0.2]} rotation={[0, 0, -0.2]} scale={[0.02, 0.1, 0.02]} material={mats.blue}><boxGeometry/></mesh>
        <mesh position={[0.6, 0.2, 0.2]} rotation={[0, 0, -0.2]} scale={[0.02, 0.15, 0.02]} material={mats.blue}><boxGeometry/></mesh>
        <mesh position={[0.65, 0.1, 0.2]} rotation={[0, 0, 0.2]} scale={[0.02, 0.1, 0.02]} material={mats.blue}><boxGeometry/></mesh>
      </group>
    </group>
  );
}

function YusaModel({ mood = 'NORMAL' }) {
  const groupRef = useRef();
  const leftBlushRef = useRef();
  const rightBlushRef = useRef();
  const leftBrowRef = useRef();
  const rightBrowRef = useRef();
  const leftBlackBrowRef = useRef();
  const rightBlackBrowRef = useRef();
  const mousePos = useRef({ x: 0, y: 0 });
  
  const animState = useRef({
    browL: 0, browR: 0, browY: 1, blushOpacity: 0
  });
  
  const typeRef = useRef('open');
  const mouthRef = useRef('normal');
  const accentRef = useRef('none');

  useEffect(() => {
    const handlePointerMove = (e) => {
      mousePos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePos.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(MOOD_CONFIG.NORMAL.color),
    roughness: 0.35,
    metalness: 0.05,
  }), []);

  const bodyGeometry = useMemo(() => {
    // Huge bevel creates a smooth puffy marshmallow-like cushion
    const geo = new THREE.ExtrudeGeometry(createCushionShape(), {
      depth: 0.1, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.45, bevelSegments: 24
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const cfg = getMoodConfig(mood);
    const st = animState.current;
    const lerpSpeed = 0.08;
    
    typeRef.current = cfg.eye;
    mouthRef.current = cfg.mouth;
    accentRef.current = cfg.accent;

    st.browL += (cfg.browL - st.browL) * lerpSpeed;
    st.browR += (cfg.browR - st.browR) * lerpSpeed;
    st.browY += (cfg.browY - st.browY) * lerpSpeed;
    st.blushOpacity += (cfg.blush - st.blushOpacity) * lerpSpeed;

    if (bodyMaterial) {
      bodyMaterial.color.lerp(new THREE.Color(cfg.color), 0.08);
    }
    if (leftBlushRef.current) mats.blush.opacity = st.blushOpacity * 0.7;

    if (leftBrowRef.current && rightBrowRef.current) {
      leftBrowRef.current.rotation.z = st.browL;
      rightBrowRef.current.rotation.z = st.browR;
      leftBrowRef.current.position.y = st.browY;
      rightBrowRef.current.position.y = st.browY;
    }
    
    if (leftBlackBrowRef.current && rightBlackBrowRef.current) {
      const isAngry = mood === 'ANGRY';
      // The bottom edge of the eyelid box is roughly browY - 0.1
      const targetBlackY = isAngry ? st.browY - 0.09 : 1.0;
      leftBlackBrowRef.current.position.y = THREE.MathUtils.lerp(leftBlackBrowRef.current.position.y, targetBlackY, lerpSpeed);
      rightBlackBrowRef.current.position.y = THREE.MathUtils.lerp(rightBlackBrowRef.current.position.y, targetBlackY, lerpSpeed);
      leftBlackBrowRef.current.rotation.z = st.browL;
      rightBlackBrowRef.current.rotation.z = st.browR;
    }

    if (groupRef.current) {
      const breath = Math.sin(t * 2.5) * 0.015;
      const idleBob = Math.sin(t * 1.8) * 0.02;

      const targetRotY = (mousePos.current.x * 0.2);
      const targetRotX = (-mousePos.current.y * 0.15);

      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.07);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.07);
      groupRef.current.position.y = -0.02 + idleBob;
      
      // Base scale reduced to 0.65 to ensure it NEVER clips outside the WebGL frustum when animating!
      groupRef.current.scale.set(0.65 + breath, 0.65 - breath * 0.4, 0.65 + breath * 0.6);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.02, 0]}>
      <mesh material={bodyMaterial} geometry={bodyGeometry} scale={[1.0, 0.85, 1.0]} />

      {/* Two top bumps blended softly into the puffy body */}
      <mesh material={bodyMaterial} position={[-0.22, 0.82, 0]} scale={[0.2, 0.2, 0.18]}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>
      <mesh material={bodyMaterial} position={[0.22, 0.82, 0]} scale={[0.2, 0.2, 0.18]}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      <YusaEye position={[-0.26, 0.12, 0.52]} typeRef={typeRef} />
      <YusaEye position={[0.26, 0.12, 0.52]} typeRef={typeRef} />
      
      {/* Dynamic eyelids using BoxGeometry for sharp, straight cuts across the eyes! */}
      <mesh ref={leftBrowRef} material={bodyMaterial} position={[-0.26, 1, 0.54]} scale={[0.4, 0.2, 0.08]}>
        <boxGeometry />
      </mesh>
      <mesh ref={rightBrowRef} material={bodyMaterial} position={[0.26, 1, 0.54]} scale={[0.4, 0.2, 0.08]}>
        <boxGeometry />
      </mesh>
      
      {/* Black strokes along the eyelid edge, shown primarily during ANGRY mood */}
      <mesh ref={leftBlackBrowRef} material={mats.black} position={[-0.26, 1, 0.55]} scale={[0.22, 0.02, 0.04]}>
        <boxGeometry />
      </mesh>
      <mesh ref={rightBlackBrowRef} material={mats.black} position={[0.26, 1, 0.55]} scale={[0.22, 0.02, 0.04]}>
        <boxGeometry />
      </mesh>

      <YusaMouth mouthRef={mouthRef} />

      <mesh ref={leftBlushRef} material={mats.blush} position={[-0.52, -0.02, 0.42]} scale={[0.14, 0.08, 0.04]}>
        <sphereGeometry args={[1, 24, 24]} />
      </mesh>
      <mesh ref={rightBlushRef} material={mats.blush} position={[0.52, -0.02, 0.42]} scale={[0.14, 0.08, 0.04]}>
        <sphereGeometry args={[1, 24, 24]} />
      </mesh>

      <Accents accentRef={accentRef} />

      <mesh position={[0, -1.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.1, 0.7, 1]}>
        <circleGeometry args={[0.82, 48]} />
        <meshBasicMaterial color="#d1d5db" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Yusa3D({ mood = 'NORMAL' }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas 
        camera={{ position: [0, 0, 4.4], fov: 38 }} 
        gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[4, 5, 4]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-4, 2, 3]} intensity={0.6} color="#ffe4e6" />
        <YusaModel mood={mood} />
      </Canvas>
    </div>
  );
}
