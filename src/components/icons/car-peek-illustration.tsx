export function CarPeekIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 70 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Car front half — back is clipped off at left edge */}
      {/* Body */}
      <path
        d="M-10 24c0-2.5 1.5-4 4-4h60c2.5 0 4 1.5 4 4v12c0 2.5-1.5 4-4 4H-6c-2.5 0-4-1.5-4-4V24z"
        fill="#F08D39"
      />
      {/* Cabin / roof */}
      <path
        d="M10 20l5-12c1-2.5 3-4 5.5-4h28c2.5 0 4.5 1.5 5.5 4l5 12H10z"
        fill="#E07D2A"
      />
      {/* Windshield */}
      <path
        d="M15 19l4-10c.8-1.5 2-2.5 3.5-2.5h24c1.5 0 2.7 1 3.5 2.5l4 10H15z"
        fill="#FFF5EB"
      />
      {/* Window divider */}
      <line x1="35" y1="6.5" x2="35" y2="19" stroke="#D97226" strokeWidth="1.5" />
      {/* Body line */}
      <path d="M-10 30h68" stroke="#D97226" strokeWidth="0.8" />
      {/* Headlight */}
      <rect x="54" y="24" width="6" height="4" rx="1.5" fill="#F3BE7A" />
      {/* Grille */}
      <rect x="56" y="30" width="4" height="6" rx="1.5" fill="#D97226" />
      {/* Door handle */}
      <rect x="22" y="26" width="6" height="1.5" rx="0.75" fill="#C96B1F" />
      {/* Bumper */}
      <rect x="-10" y="38" width="72" height="2.5" rx="1.25" fill="#D97226" />
      {/* Front wheel */}
      <circle cx="48" cy="41" r="6" fill="#3A3A3A" />
      <circle cx="48" cy="41" r="3" fill="#6A6A6A" />
      <circle cx="48" cy="41" r="1" fill="#888" />
      {/* Back wheel (partially visible) */}
      <circle cx="8" cy="41" r="6" fill="#3A3A3A" />
      <circle cx="8" cy="41" r="3" fill="#6A6A6A" />
      <circle cx="8" cy="41" r="1" fill="#888" />
    </svg>
  );
}
