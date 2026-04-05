export function NavigateIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Road surface */}
      <path
        d="M0 60c30-15 50-5 70 0s40 15 70 0v40H0V60z"
        fill="#e8dfd2"
      />
      {/* Road markings */}
      <path
        d="M10 72h18m10 0h18m10 0h18m10 0h18m10 0h10"
        stroke="#FFF5EB"
        strokeWidth="2"
        strokeDasharray="6 8"
      />
      {/* Navigation sign post */}
      <rect x="28" y="18" width="4" height="52" rx="2" fill="#888" />
      {/* Speed sign */}
      <circle cx="30" cy="24" r="14" fill="white" stroke="#E07D2A" strokeWidth="3" />
      <text
        x="30"
        y="29"
        textAnchor="middle"
        fill="#333"
        fontSize="13"
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
      >
        40
      </text>
      {/* Direction arrow sign */}
      <rect x="80" y="20" width="40" height="24" rx="4" fill="#F08D39" />
      <path
        d="M92 32h20m-6-5l6 5-6 5"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sign post */}
      <rect x="98" y="44" width="4" height="30" rx="2" fill="#888" />
      {/* Parking sign */}
      <rect x="56" y="30" width="22" height="22" rx="4" fill="#3852B4" />
      <text
        x="67"
        y="46"
        textAnchor="middle"
        fill="white"
        fontSize="15"
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
      >
        P
      </text>
      <rect x="65" y="52" width="4" height="22" rx="2" fill="#888" />
      {/* Ground shadow */}
      <ellipse cx="70" cy="88" rx="55" ry="4" fill="#888" opacity="0.08" />
    </svg>
  );
}
