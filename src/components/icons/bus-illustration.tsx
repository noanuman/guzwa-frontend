export function BusIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bus body - main */}
      <rect x="10" y="28" width="100" height="44" rx="6" fill="#F08D39" />
      {/* Roof */}
      <rect x="10" y="28" width="100" height="12" rx="6" fill="#E07D2A" />
      {/* Front face */}
      <rect x="100" y="28" width="18" height="44" rx="4" fill="#D97226" />
      {/* Windshield front */}
      <rect x="102" y="34" width="14" height="20" rx="3" fill="#FFF5EB" />
      {/* Side windows */}
      <rect x="16" y="34" width="14" height="14" rx="2.5" fill="#FFF5EB" />
      <rect x="34" y="34" width="14" height="14" rx="2.5" fill="#FFF5EB" />
      <rect x="52" y="34" width="14" height="14" rx="2.5" fill="#FFF5EB" />
      <rect x="70" y="34" width="14" height="14" rx="2.5" fill="#FFF5EB" />
      <rect x="88" y="34" width="10" height="14" rx="2.5" fill="#FFF5EB" />
      {/* Door */}
      <rect x="16" y="52" width="14" height="18" rx="2" fill="#E07D2A" />
      <line x1="23" y1="52" x2="23" y2="70" stroke="#C96B1F" strokeWidth="1.2" />
      {/* Bumper */}
      <rect x="8" y="68" width="112" height="4" rx="2" fill="#D97226" />
      {/* Headlights */}
      <circle cx="113" cy="60" r="3" fill="#F3BE7A" />
      <rect x="10" y="58" width="4" height="6" rx="2" fill="#FF6B6B" />
      {/* Route display */}
      <rect x="102" y="30" width="14" height="6" rx="1.5" fill="#F3BE7A" />
      {/* Wheels */}
      <circle cx="30" cy="74" r="7" fill="#3A3A3A" />
      <circle cx="30" cy="74" r="3" fill="#6A6A6A" />
      <circle cx="90" cy="74" r="7" fill="#3A3A3A" />
      <circle cx="90" cy="74" r="3" fill="#6A6A6A" />
      {/* Ground shadow */}
      <ellipse cx="65" cy="84" rx="50" ry="4" fill="#F08D39" opacity="0.12" />
    </svg>
  );
}
