import React, { useState } from 'react';
import { Info, Sparkles } from 'lucide-react';

interface OrganelleInfo {
  name: string;
  role: string;
  x: number;
  y: number;
  pointerEnd: { x: number; y: number };
  align: 'left' | 'right';
}

export const NeuronAnatomyDiagram: React.FC = () => {
  const [activeOrganelle, setActiveOrganelle] = useState<string | null>(null);

  const organelles: OrganelleInfo[] = [
    {
      name: 'Dendrites',
      role: 'Branching afferent projections that receive chemical and electrical signals from presynaptic neurons.',
      x: 370,
      y: 190,
      pointerEnd: { x: 330, y: 220 },
      align: 'right'
    },
    {
      name: 'Nuclear membrane',
      role: 'Double-lipid bilayer perforated with pores regulating nuclear-cytoplasmic transport.',
      x: 480,
      y: 225,
      pointerEnd: { x: 425, y: 245 },
      align: 'right'
    },
    {
      name: 'Smooth endoplasmic reticulum',
      role: 'Synthesizes lipids, metabolizes carbohydrates, and sequesters intracellular calcium ions.',
      x: 480,
      y: 260,
      pointerEnd: { x: 410, y: 270 },
      align: 'right'
    },
    {
      name: 'Nucleolus',
      role: 'Dense subnuclear structure synthesizing ribosomal RNA (rRNA) and assembling ribosome subunits.',
      x: 480,
      y: 295,
      pointerEnd: { x: 400, y: 300 },
      align: 'right'
    },
    {
      name: 'Nuclear pore',
      role: 'Protein complex channels enabling macromolecule transport between nucleus and cytoplasm.',
      x: 480,
      y: 325,
      pointerEnd: { x: 388, y: 320 },
      align: 'right'
    },
    {
      name: 'Sex chromosome',
      role: 'Dense Barr body heterochromatin visible adjacent to inner nuclear membrane in female neurons.',
      x: 480,
      y: 355,
      pointerEnd: { x: 412, y: 330 },
      align: 'right'
    },
    {
      name: 'Golgi apparatus',
      role: 'Flattened membranous cisternae that modify, sort, and package proteins into secretory vesicles.',
      x: 480,
      y: 395,
      pointerEnd: { x: 390, y: 360 },
      align: 'right'
    },
    {
      name: 'Mitochondrion',
      role: 'Generates cellular ATP through oxidative phosphorylation to power Na+/K+ ATPase pumps.',
      x: 230,
      y: 260,
      pointerEnd: { x: 305, y: 285 },
      align: 'left'
    },
    {
      name: 'Rough endoplasmic reticulum',
      role: 'Nissl substance: ribosome-studded cisternae actively translating neurotransmitter and membrane proteins.',
      x: 230,
      y: 295,
      pointerEnd: { x: 315, y: 325 },
      align: 'left'
    },
    {
      name: 'Free ribosomes',
      role: 'Cytoplasmic complexes synthesizing cytosolic and structural proteins for the neuron.',
      x: 230,
      y: 395,
      pointerEnd: { x: 330, y: 365 },
      align: 'left'
    }
  ];

  return (
    <div className="my-6 p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 font-sans">
      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-600" />
          <span>Interactive Anatomical Figure: Fine Structure of a Neuron</span>
        </span>
        <span className="text-[11px] text-slate-400">Click or hover labels to inspect cytology</span>
      </div>

      {/* SVG Canvas for Figure 1.1 */}
      <div className="relative w-full overflow-x-auto flex justify-center py-2">
        <svg
          viewBox="0 0 720 440"
          className="w-full max-w-2xl h-auto select-none"
          style={{ minWidth: '580px' }}
        >
          <defs>
            <radialGradient id="neuronSomaGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fdf2f8" />
              <stop offset="70%" stopColor="#fce7f3" />
              <stop offset="100%" stopColor="#fbcfe8" />
            </radialGradient>
            <radialGradient id="nucleusGrad" cx="45%" cy="45%" r="50%">
              <stop offset="0%" stopColor="#fae8ff" />
              <stop offset="75%" stopColor="#f5d0fe" />
              <stop offset="100%" stopColor="#e879f9" />
            </radialGradient>
            <radialGradient id="nucleolusGrad" cx="40%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#a21caf" />
              <stop offset="100%" stopColor="#701a75" />
            </radialGradient>
            <linearGradient id="axonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbcfe8" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
            <filter id="diagramShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Background Neuron Cell Body & Branching Dendrites */}
          <g filter="url(#diagramShadow)">
            {/* Dendrite Branch 1: Top-Left */}
            <path
              d="M 330 250 C 290 210, 250 190, 200 170 C 180 162, 170 140, 150 135 M 220 178 C 210 145, 195 125, 175 110 M 260 200 C 240 160, 230 140, 215 120"
              stroke="#db2777"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Dendrite Branch 2: Top-Right */}
            <path
              d="M 390 240 C 420 190, 450 160, 480 130 C 500 110, 520 100, 545 90 M 440 175 C 470 155, 495 140, 515 120 M 465 145 C 485 125, 500 105, 520 85"
              stroke="#db2777"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Dendrite Branch 3: Far-Left */}
            <path
              d="M 310 300 C 260 290, 220 280, 180 270 C 150 262, 130 255, 100 250 M 200 275 C 175 250, 150 235, 120 220"
              stroke="#db2777"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Dendrite Branch 4: Bottom-Left */}
            <path
              d="M 320 350 C 280 370, 240 390, 200 410 C 180 420, 160 425, 130 430 M 230 395 C 210 415, 190 425, 165 435"
              stroke="#db2777"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Axon Hillock & Axon Trunk (Bottom-Right) */}
            <path
              d="M 405 345 C 430 375, 460 395, 500 410 C 530 420, 560 425, 600 428"
              stroke="#be185d"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />

            {/* Main Soma Membrane Outline */}
            <path
              d="M 330 240 C 360 220, 400 225, 425 250 C 450 275, 445 320, 430 350 C 415 375, 380 380, 350 375 C 320 370, 300 340, 305 300 C 310 260, 315 245, 330 240 Z"
              fill="url(#neuronSomaGrad)"
              stroke="#be185d"
              strokeWidth="2.5"
            />
          </g>

          {/* Nucleus & Nucleolus */}
          <ellipse
            cx="375"
            cy="300"
            rx="38"
            ry="34"
            fill="url(#nucleusGrad)"
            stroke="#9333ea"
            strokeWidth="1.8"
            strokeDasharray="4 2"
          />
          {/* Dense Nucleolus */}
          <circle
            cx="390"
            cy="296"
            r="11"
            fill="url(#nucleolusGrad)"
          />
          {/* Sex Chromosome (Barr Body) adjacent to nuclear membrane */}
          <ellipse
            cx="405"
            cy="320"
            rx="3.5"
            ry="2.5"
            fill="#581c87"
          />

          {/* Organelle Details inside Cytoplasm */}
          {/* Mitochondria 1 & 2 */}
          <g>
            <ellipse cx="328" cy="272" rx="9" ry="5" fill="#f43f5e" stroke="#9f1239" strokeWidth="1" transform="rotate(-25 328 272)" />
            <path d="M 323 272 Q 328 270 333 272" stroke="#ffffff" strokeWidth="0.8" fill="none" />
            
            <ellipse cx="340" cy="345" rx="10" ry="5.5" fill="#f43f5e" stroke="#9f1239" strokeWidth="1" transform="rotate(35 340 345)" />
            <path d="M 335 345 Q 340 343 345 345" stroke="#ffffff" strokeWidth="0.8" fill="none" />
          </g>

          {/* Rough Endoplasmic Reticulum (Nissl Substance) */}
          <g stroke="#3b82f6" strokeWidth="1.2" fill="none">
            <path d="M 322 315 Q 330 310 338 318" />
            <path d="M 325 325 Q 333 320 341 328" />
            <path d="M 328 335 Q 336 330 344 338" />
          </g>
          {/* Ribosome Granules */}
          <g fill="#1d4ed8">
            <circle cx="325" cy="313" r="1.2" />
            <circle cx="335" cy="316" r="1.2" />
            <circle cx="328" cy="323" r="1.2" />
            <circle cx="338" cy="326" r="1.2" />
            <circle cx="332" cy="333" r="1.2" />
            <circle cx="342" cy="336" r="1.2" />
          </g>

          {/* Smooth Endoplasmic Reticulum */}
          <path
            d="M 420 265 Q 412 272 418 280"
            stroke="#10b981"
            strokeWidth="1.5"
            fill="none"
          />

          {/* Golgi Apparatus */}
          <g stroke="#f59e0b" strokeWidth="1.4" fill="none">
            <path d="M 380 355 Q 392 360 405 352" />
            <path d="M 382 360 Q 394 365 407 357" />
          </g>

          {/* Free Ribosomes Cluster */}
          <g fill="#64748b">
            <circle cx="348" cy="365" r="1.2" />
            <circle cx="352" cy="362" r="1.2" />
            <circle cx="355" cy="367" r="1.2" />
            <circle cx="359" cy="364" r="1.2" />
          </g>

          {/* Pointers and Text Labels */}
          {organelles.map((org) => {
            const isHovered = activeOrganelle === org.name;
            return (
              <g
                key={org.name}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setActiveOrganelle(org.name)}
                onMouseLeave={() => setActiveOrganelle(null)}
                onClick={() => setActiveOrganelle(activeOrganelle === org.name ? null : org.name)}
              >
                {/* Pointer Line */}
                <line
                  x1={org.x}
                  y1={org.y}
                  x2={org.pointerEnd.x}
                  y2={org.pointerEnd.y}
                  stroke={isHovered ? '#db2777' : '#94a3b8'}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeDasharray={isHovered ? undefined : '2 2'}
                />
                {/* Endpoint Target Dot */}
                <circle
                  cx={org.pointerEnd.x}
                  cy={org.pointerEnd.y}
                  r={isHovered ? 3.5 : 2}
                  fill={isHovered ? '#db2777' : '#64748b'}
                />
                {/* Text Label */}
                <text
                  x={org.x + (org.align === 'left' ? -6 : 6)}
                  y={org.y + 4}
                  textAnchor={org.align === 'left' ? 'end' : 'start'}
                  className={`text-[11px] font-sans transition-all ${
                    isHovered
                      ? 'fill-pink-700 dark:fill-pink-400 font-bold'
                      : 'fill-slate-700 dark:fill-slate-300 font-medium'
                  }`}
                >
                  {org.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Organelle Cytology Description Pill */}
      {activeOrganelle && (
        <div className="p-3 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900 rounded-xl text-xs space-y-1 animate-fadeIn">
          <div className="font-bold text-pink-900 dark:text-pink-200 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-pink-600" />
            <span>Cytology: {activeOrganelle}</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300">
            {organelles.find(o => o.name === activeOrganelle)?.role}
          </p>
        </div>
      )}

      {/* Academic Citation Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 italic text-center">
        Fig. 1.1 Fine structure of a neuron (after Wilkinson, J.L.: Neuroanatomy for Medical Students, 2nd edn, Butterworth-Heinemann, Oxford 1992).
      </div>
    </div>
  );
};
