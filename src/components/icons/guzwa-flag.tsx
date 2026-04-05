export function GuzwaFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Pole */}
      <rect x="4" y="0" width="3" height="44" rx="1.5" fill="#8a7e74" />
      {/* Flag body */}
      <path
        d="M7 2 L36 8 L30 16 L36 24 L7 18 Z"
        fill="url(#flagGradient)"
      />
      {/* Pole base dot — this is the actual location point */}
      <circle cx="5.5" cy="45" r="3" fill="#F08D39" fillOpacity="0.4" />
      <circle cx="5.5" cy="45" r="1.5" fill="#F08D39" />
      <defs>
        <linearGradient id="flagGradient" x1="7" y1="2" x2="36" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F08D39" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}
