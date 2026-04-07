const svgDataUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const backdrop = ({
  base,
  accent,
  glow,
  motif,
}: {
  base: string;
  accent: string;
  glow: string;
  motif: string;
}) =>
  svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${base}" />
          <stop offset="100%" stop-color="#050914" />
        </linearGradient>
        <radialGradient id="glow" cx="65%" cy="25%" r="60%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
        </radialGradient>
        <filter id="grain">
          <feTurbulence baseFrequency="0.9" numOctaves="2" seed="11" type="fractalNoise" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0 0.06 0.09" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)"/>
      <rect width="1600" height="900" fill="url(#glow)"/>
      <g opacity="0.22">${motif}</g>
      <rect width="1600" height="900" filter="url(#grain)"/>
      <rect x="56" y="56" width="1488" height="788" rx="36" ry="36" fill="none" stroke="${accent}" stroke-opacity="0.16" stroke-width="2"/>
    </svg>
  `);

export const gameArtById: Record<string, string> = {
  'tic-tac-toe': backdrop({
    base: '#052e2b',
    accent: '#7ef0cb',
    glow: '#2dd4bf',
    motif: `
      <rect x="860" y="120" width="420" height="420" rx="32" fill="none" stroke="#7ef0cb" stroke-width="18"/>
      <path d="M1000 120v420M1140 120v420M860 260h420M860 400h420" stroke="#7ef0cb" stroke-width="12"/>
      <path d="M285 220l120 120m0-120L285 340" stroke="#fff" stroke-width="26" stroke-linecap="round"/>
      <circle cx="520" cy="300" r="84" fill="none" stroke="#9ef9f2" stroke-width="24"/>
    `,
  }),
  'connect-4': backdrop({
    base: '#0b2145',
    accent: '#8fc8ff',
    glow: '#2563eb',
    motif: `
      <rect x="850" y="160" width="500" height="420" rx="36" fill="#60a5fa" fill-opacity="0.2" stroke="#93c5fd" stroke-width="16"/>
      ${Array.from({ length: 7 }, (_, c) =>
        Array.from({ length: 6 }, (_, r) => `<circle cx="${905 + c * 68}" cy="${215 + r * 62}" r="22" fill="${(r + c) % 3 === 0 ? '#facc15' : (r + c) % 3 === 1 ? '#fb7185' : '#1e3a8a'}" fill-opacity="0.65"/>`).join('')
      ).join('')}
      <circle cx="350" cy="240" r="108" fill="#facc15" fill-opacity="0.75"/>
      <circle cx="470" cy="360" r="108" fill="#fb7185" fill-opacity="0.72"/>
    `,
  }),
  checkers: backdrop({
    base: '#3a1908',
    accent: '#ffd09c',
    glow: '#f59e0b',
    motif: `
      <rect x="840" y="120" width="460" height="460" rx="30" fill="#1f120c" fill-opacity="0.42" stroke="#f6c48b" stroke-width="14"/>
      ${Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 8 }, (_, c) => `<rect x="${860 + c * 54}" y="${140 + r * 54}" width="54" height="54" fill="${(r + c) % 2 ? '#8b5a2b' : '#f6d4aa'}" fill-opacity="0.65"/>`).join('')
      ).join('')}
      <circle cx="360" cy="260" r="90" fill="#f97316" fill-opacity="0.72"/>
      <circle cx="470" cy="360" r="90" fill="#f8fafc" fill-opacity="0.72"/>
    `,
  }),
  reversi: backdrop({
    base: '#06251c',
    accent: '#94ffd0',
    glow: '#10b981',
    motif: `
      <rect x="840" y="140" width="460" height="460" rx="30" fill="#0f5132" fill-opacity="0.42" stroke="#9efad8" stroke-width="14"/>
      ${Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 8 }, (_, c) => `<rect x="${860 + c * 54}" y="${160 + r * 54}" width="54" height="54" fill="#15803d" fill-opacity="${0.4 + ((r + c) % 3) * 0.08}"/>`).join('')
      ).join('')}
      <circle cx="390" cy="250" r="84" fill="#111827" fill-opacity="0.8"/>
      <circle cx="500" cy="355" r="84" fill="#f8fafc" fill-opacity="0.82"/>
    `,
  }),
  battleship: backdrop({
    base: '#08243f',
    accent: '#8ce4ff',
    glow: '#22d3ee',
    motif: `
      ${Array.from({ length: 9 }, (_, i) => `<path d="M850 ${160 + i * 52}h450" stroke="#8ce4ff" stroke-opacity="0.35"/>`).join('')}
      ${Array.from({ length: 9 }, (_, i) => `<path d="M850 ${160}v420" transform="translate(${i * 56} 0)" stroke="#8ce4ff" stroke-opacity="0.35"/>`).join('')}
      <path d="M260 420c120-200 300-180 470-20" fill="none" stroke="#7dd3fc" stroke-width="30" stroke-linecap="round"/>
      <path d="M360 280l140-46 120 34-40 42-150 8z" fill="#f8fafc" fill-opacity="0.7"/>
      <circle cx="1080" cy="320" r="34" fill="#fb7185" fill-opacity="0.82"/>
    `,
  }),
  blackjack: backdrop({
    base: '#1f1304',
    accent: '#ffd79a',
    glow: '#f97316',
    motif: `
      <ellipse cx="1100" cy="360" rx="280" ry="170" fill="#14532d" fill-opacity="0.8"/>
      <path d="M250 540h360a60 60 0 0 0 60-60V220" fill="none" stroke="#facc15" stroke-width="26" stroke-linecap="round"/>
      <rect x="920" y="240" width="120" height="180" rx="16" fill="#fff8ef"/>
      <rect x="1060" y="270" width="120" height="180" rx="16" fill="#fff1df"/>
      <text x="953" y="335" font-size="96" fill="#7c2d12">A</text>
      <text x="1098" y="370" font-size="96" fill="#7c2d12">10</text>
    `,
  }),
  solitaire: backdrop({
    base: '#062d22',
    accent: '#9cf5d0',
    glow: '#10b981',
    motif: `
      <rect x="890" y="160" width="120" height="180" rx="16" fill="#fff"/>
      <rect x="1040" y="200" width="120" height="180" rx="16" fill="#fffaf0"/>
      <rect x="1190" y="240" width="120" height="180" rx="16" fill="#fef3c7"/>
      <text x="930" y="280" font-size="86" fill="#be123c">A</text>
      <text x="1082" y="322" font-size="86" fill="#0f766e">K</text>
      <text x="1232" y="366" font-size="86" fill="#4338ca">Q</text>
      <rect x="220" y="180" width="420" height="520" rx="42" fill="#0f5132" fill-opacity="0.38" stroke="#9cf5d0" stroke-width="12"/>
    `,
  }),
  'memory-match': backdrop({
    base: '#3f0a1f',
    accent: '#ffc1d2',
    glow: '#fb7185',
    motif: `
      ${Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => `<rect x="${880 + c * 96}" y="${150 + r * 110}" width="78" height="98" rx="18" fill="${(r + c) % 2 ? '#fda4af' : '#fce7f3'}" fill-opacity="0.65"/>`).join('')
      ).join('')}
      <circle cx="310" cy="270" r="78" fill="#fde68a" fill-opacity="0.78"/>
      <circle cx="440" cy="370" r="78" fill="#93c5fd" fill-opacity="0.76"/>
    `,
  }),
  chess: backdrop({
    base: '#1b1712',
    accent: '#fde7c6',
    glow: '#f8fafc',
    motif: `
      <rect x="840" y="130" width="460" height="460" rx="26" fill="#000" fill-opacity="0.22"/>
      ${Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 8 }, (_, c) => `<rect x="${860 + c * 54}" y="${150 + r * 54}" width="54" height="54" fill="${(r + c) % 2 ? '#5b4636' : '#f5e6d1'}" fill-opacity="0.88"/>`).join('')
      ).join('')}
      <path d="M300 510c0-110 70-170 160-170 90 0 160 60 160 170z" fill="#f8fafc" fill-opacity="0.76"/>
      <path d="M390 240h80v120h-80z" fill="#111827" fill-opacity="0.85"/>
    `,
  }),
  hearts: backdrop({
    base: '#3a0914',
    accent: '#ffc1cc',
    glow: '#ef4444',
    motif: `
      <rect x="870" y="150" width="120" height="176" rx="18" fill="#fff"/>
      <rect x="1010" y="195" width="120" height="176" rx="18" fill="#fff"/>
      <rect x="1150" y="240" width="120" height="176" rx="18" fill="#fff"/>
      <text x="910" y="274" font-size="82" fill="#be123c">♥</text>
      <text x="1050" y="320" font-size="82" fill="#be123c">♥</text>
      <text x="1188" y="365" font-size="82" fill="#111827">♠</text>
      <path d="M260 520c100-220 240-240 430-46" fill="none" stroke="#fb7185" stroke-width="32" stroke-linecap="round"/>
    `,
  }),
  'crazy-eights': backdrop({
    base: '#3b2a05',
    accent: '#fff1a8',
    glow: '#fde047',
    motif: `
      <circle cx="310" cy="280" r="120" fill="#facc15" fill-opacity="0.78"/>
      <text x="265" y="316" font-size="150" fill="#7c2d12">8</text>
      <rect x="900" y="180" width="120" height="176" rx="18" fill="#fff"/>
      <rect x="1040" y="230" width="120" height="176" rx="18" fill="#fff"/>
      <rect x="1180" y="280" width="120" height="176" rx="18" fill="#fff"/>
      <path d="M950 520h310" stroke="#fef08a" stroke-width="24" stroke-linecap="round"/>
    `,
  }),
  ludo: backdrop({
    base: '#3f1010',
    accent: '#ffb1b1',
    glow: '#f87171',
    motif: `
      <rect x="860" y="140" width="440" height="440" rx="30" fill="#ffffff" fill-opacity="0.16" stroke="#fecaca" stroke-width="14"/>
      <rect x="860" y="140" width="220" height="220" fill="#ef4444" fill-opacity="0.55"/>
      <rect x="1080" y="140" width="220" height="220" fill="#facc15" fill-opacity="0.55"/>
      <rect x="860" y="360" width="220" height="220" fill="#22c55e" fill-opacity="0.55"/>
      <rect x="1080" y="360" width="220" height="220" fill="#3b82f6" fill-opacity="0.55"/>
      <circle cx="360" cy="280" r="94" fill="#fff" fill-opacity="0.88"/>
      <circle cx="328" cy="250" r="12" fill="#111827"/><circle cx="392" cy="250" r="12" fill="#111827"/><circle cx="328" cy="310" r="12" fill="#111827"/><circle cx="392" cy="310" r="12" fill="#111827"/>
    `,
  }),
  backgammon: backdrop({
    base: '#261140',
    accent: '#e8c8ff',
    glow: '#c084fc',
    motif: `
      <rect x="830" y="160" width="500" height="420" rx="30" fill="#f59e0b" fill-opacity="0.12" stroke="#f5d0fe" stroke-width="12"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M${850 + i * 40} 180l20 120 20-120" fill="${i % 2 ? '#7e22ce' : '#f59e0b'}" fill-opacity="0.72"/>`).join('')}
      ${Array.from({ length: 12 }, (_, i) => `<path d="M${850 + i * 40} 560l20-120 20 120" fill="${i % 2 ? '#7e22ce' : '#f59e0b'}" fill-opacity="0.72"/>`).join('')}
      <circle cx="320" cy="270" r="78" fill="#f8fafc" fill-opacity="0.82"/>
      <circle cx="430" cy="360" r="78" fill="#fb923c" fill-opacity="0.76"/>
    `,
  }),
  'texas-holdem': backdrop({
    base: '#2e0a0a',
    accent: '#ffc0c0',
    glow: '#ef4444',
    motif: `
      <ellipse cx="1100" cy="360" rx="290" ry="180" fill="#14532d" fill-opacity="0.82"/>
      ${[900, 1030, 1160, 1290].map((x, index) => `<rect x="${x}" y="${220 + index * 18}" width="110" height="168" rx="16" fill="#fff${index % 2 ? 'af' : ''}"/>`).join('')}
      <text x="320" y="330" font-size="136" fill="#fde68a">$</text>
      <circle cx="470" cy="330" r="90" fill="#f59e0b" fill-opacity="0.78"/>
    `,
  }),
  trivia: backdrop({
    base: '#08213d',
    accent: '#a6e3ff',
    glow: '#38bdf8',
    motif: `
      <circle cx="330" cy="310" r="120" fill="#38bdf8" fill-opacity="0.7"/>
      <text x="278" y="352" font-size="170" fill="#082f49">?</text>
      <rect x="900" y="170" width="360" height="88" rx="18" fill="#fff" fill-opacity="0.86"/>
      <rect x="900" y="290" width="360" height="88" rx="18" fill="#dbeafe" fill-opacity="0.75"/>
      <rect x="900" y="410" width="360" height="88" rx="18" fill="#e0f2fe" fill-opacity="0.7"/>
    `,
  }),
  'drawing-club': backdrop({
    base: '#052922',
    accent: '#9ff7dd',
    glow: '#2dd4bf',
    motif: `
      <rect x="860" y="170" width="470" height="380" rx="26" fill="#f8fafc" fill-opacity="0.18" stroke="#9ff7dd" stroke-width="10"/>
      <path d="M910 470c70-160 160-180 250-70 70 80 120 40 150-30" fill="none" stroke="#ecfeff" stroke-width="18" stroke-linecap="round"/>
      <path d="M270 540l170-260 110 70-170 260z" fill="#fde68a" fill-opacity="0.88"/>
      <path d="M255 558l58-86 110 70-58 86z" fill="#fb7185" fill-opacity="0.82"/>
    `,
  }),
  charades: backdrop({
    base: '#05251f',
    accent: '#9ef7ea',
    glow: '#14b8a6',
    motif: `
      <circle cx="360" cy="220" r="70" fill="#ecfeff" fill-opacity="0.86"/>
      <path d="M360 290l0 180M360 360l-110 80M360 360l110 80M360 470l-90 130M360 470l90 130" stroke="#ecfeff" stroke-width="26" stroke-linecap="round"/>
      <rect x="920" y="220" width="320" height="120" rx="24" fill="#ccfbf1" fill-opacity="0.26" stroke="#99f6e4" stroke-width="10"/>
      <text x="1000" y="300" font-size="80" fill="#e6fffb">ACT</text>
    `,
  }),
  'bluffing-room': backdrop({
    base: '#330b22',
    accent: '#ffc3e7',
    glow: '#f472b6',
    motif: `
      <rect x="890" y="170" width="110" height="170" rx="16" fill="#fff"/>
      <rect x="1030" y="210" width="110" height="170" rx="16" fill="#fff"/>
      <rect x="1170" y="250" width="110" height="170" rx="16" fill="#fff"/>
      <text x="928" y="278" font-size="72" fill="#831843">WORD</text>
      <text x="1070" y="322" font-size="72" fill="#831843">WORD</text>
      <text x="1196" y="366" font-size="72" fill="#111827">ODD</text>
      <circle cx="310" cy="300" r="90" fill="#fdf2f8" fill-opacity="0.76"/>
      <text x="274" y="338" font-size="110" fill="#831843">!</text>
    `,
  }),
};

export const gameBackdropStyle = (gameId: string, themeColor: string) => ({
  backgroundImage: `linear-gradient(135deg, ${themeColor}44, rgba(4, 9, 20, 0.94)), ${gameArtById[gameId]}`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});
