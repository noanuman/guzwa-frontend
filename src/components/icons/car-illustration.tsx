export function CarIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Car body */}
      <path
        d="M16 56c0-3 2-5 5-5h88c3 0 5 2 5 5v14c0 3-2 5-5 5H21c-3 0-5-2-5-5V56z"
        fill="#F08D39"
      />
      {/* Roof / cabin */}
      <path
        d="M34 51l6-16c1.5-3 4-5 7-5h36c3 0 5.5 2 7 5l6 16H34z"
        fill="#E07D2A"
      />
      {/* Windshield */}
      <path
        d="M40 49l5-13c1-2 2.5-3 4.5-3h33c2 0 3.5 1 4.5 3l5 13H40z"
        fill="#FFF5EB"
      />
      {/* Window divider */}
      <line x1="68" y1="33" x2="68" y2="49" stroke="#D97226" strokeWidth="2" />
      {/* Side body line */}
      <path d="M20 62h94" stroke="#D97226" strokeWidth="1" />
      {/* Front headlights */}
      <rect x="106" y="56" width="8" height="5" rx="2" fill="#F3BE7A" />
      {/* Rear lights */}
      <rect x="18" y="56" width="6" height="5" rx="2" fill="#FF6B6B" />
      {/* Door handles */}
      <rect x="50" y="58" width="8" height="2" rx="1" fill="#C96B1F" />
      <rect x="76" y="58" width="8" height="2" rx="1" fill="#C96B1F" />
      {/* Front grille */}
      <rect x="108" y="63" width="6" height="8" rx="2" fill="#D97226" />
      {/* Bumpers */}
      <rect x="14" y="72" width="104" height="3" rx="1.5" fill="#D97226" />
      {/* Wheels */}
      <circle cx="38" cy="76" r="8" fill="#3A3A3A" />
      <circle cx="38" cy="76" r="4" fill="#6A6A6A" />
      <circle cx="38" cy="76" r="1.5" fill="#888" />
      <circle cx="94" cy="76" r="8" fill="#3A3A3A" />
      <circle cx="94" cy="76" r="4" fill="#6A6A6A" />
      <circle cx="94" cy="76" r="1.5" fill="#888" />
      {/* Ground shadow */}
      <ellipse cx="66" cy="87" rx="48" ry="4" fill="#F08D39" opacity="0.12" />
    </svg>
  );
}
