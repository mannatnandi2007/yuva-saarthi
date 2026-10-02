import React from 'react';

/**
 * Anatomical Side-Angle Lateral Brain Logo
 * Precision modeled directly on the reference illustration:
 * - Frontal lobe (left anterior curve)
 * - Parietal arch (superior dorsal crest)
 * - Occipital lobe (right posterior curve)
 * - Horizontal foliar striations of the cerebellum (lower right)
 * - Tilted brainstem descending from the inferior base
 * - Distinct looping gyri & sulci convolutions
 * - Rendered in sleek Electric Blue (#3b82f6), Sky Cyan (#38bdf8), and Ice (#e0f2fe)
 */
export default function BrainLogo({ size = 38, className = '', animated = true }) {
  return (
    <div 
      className={`brain-logo-wrapper ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transition: 'transform 0.2s ease',
          animation: animated ? 'brain-breathe 4s ease-in-out infinite' : 'none'
        }}
      >
        {/* 1. BRAIN STEM */}
        <path
          d="M 64 78 L 74 98 C 76 100 81 99 82 96 L 75 75 Z"
          fill="rgba(168, 85, 247, 0.2)"
          stroke="#9333ea"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* 2. CEREBELLUM */}
        <path
          d="M 66 73 
             C 65 67 78 66 88 67 
             C 96 68 100 73 99 78 
             C 98 83 91 87 81 87 
             C 72 87 66 81 66 73 Z"
          fill="rgba(236, 72, 153, 0.2)"
          stroke="#db2777"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* Cerebellar Folia */}
        <path d="M 70 70 C 78 69 88 70 94 72" stroke="#f472b6" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 68 74 C 77 73 88 74 97 76" stroke="#f472b6" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 69 78 C 78 77 87 78 95 81" stroke="#f472b6" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M 72 82 C 78 81 86 82 91 84" stroke="#f472b6" strokeWidth="1.1" strokeLinecap="round" />

        {/* 3. MAIN CEREBRAL PERIMETER */}
        <path
          d="M 40 76
             C 32 75 25 71 21 66
             C 14 58 13 47 16 38
             C 19 29 27 21 38 17
             C 50 13 65 14 78 18
             C 89 22 99 29 104 39
             C 108 48 107 57 101 64
             C 96 69 90 71 85 71
             C 78 71 74 68 70 67
             C 66 66 61 68 57 71
             C 51 75 46 76 40 76 Z"
          fill="rgba(168, 85, 247, 0.08)"
          stroke="#9333ea"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 4. TEMPORAL LOBE SWEEP */}
        <path
          d="M 21 66 
             C 25 69 31 71 39 70 
             C 49 69 58 64 64 61"
          stroke="#ec4899"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* 5. MAJOR SULCI & GYRI CONVOLUTIONS (Modelled on reference image) */}
        
        {/* Frontal Pole & Prefrontal Gyri (Front-left) */}
        <path
          d="M 21 44 C 28 42 35 45 37 51 C 38 56 33 60 26 60"
          stroke="#c084fc"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M 22 34 C 29 32 37 36 39 42"
          stroke="#c084fc"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 33 22 C 38 27 38 34 32 38"
          stroke="#c084fc"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Superior Frontal & Central Arch (Top-left to vertex) */}
        <path
          d="M 44 17 C 47 24 45 32 50 38 C 55 43 62 41 64 35 C 66 29 60 23 54 20"
          stroke="#c084fc"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M 48 37 C 45 44 49 51 56 52 C 63 53 66 48 64 43"
          stroke="#c084fc"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Parietal Dorsal Gyri (Top-center to top-right) */}
        <path
          d="M 64 16 C 68 22 74 24 76 30 C 78 37 72 43 68 46"
          stroke="#c084fc"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M 76 21 C 82 25 88 28 87 35 C 86 42 78 45 76 51 C 74 56 79 61 84 62"
          stroke="#c084fc"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Occipital Lobular Convolutions (Back-right curve) */}
        <path
          d="M 94 28 C 98 34 97 42 93 47 C 89 51 92 58 97 59"
          stroke="#c084fc"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M 98 44 C 103 48 101 55 96 58"
          stroke="#c084fc"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Mid-Lateral & Temporal Internal Gyri */}
        <path
          d="M 37 54 C 44 54 48 58 55 58 C 61 58 64 54 62 50"
          stroke="#c084fc"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 34 64 C 41 64 47 62 52 64"
          stroke="#c084fc"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Fine Accent Highlights (Reference-inspired crest lines) */}
        <path d="M 28 26 C 33 24 37 26 40 28" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
        <path d="M 58 18 C 64 18 70 20 74 23" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
        <path d="M 85 24 C 91 28 95 32 97 37" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
        <path d="M 24 64 C 30 67 36 67 42 66" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      </svg>
    </div>
  );
}
