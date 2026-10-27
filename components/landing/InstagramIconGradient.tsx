/** Ícone Instagram com gradiente oficial (SVG). */
export default function InstagramIconGradient({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="ig-radial" cx="0.35" cy="1" r="1.2">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="25%" stopColor="#FA7E1E" />
          <stop offset="50%" stopColor="#D62976" />
          <stop offset="75%" stopColor="#962FBF" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#ig-radial)" />
      <rect x="10" y="10" width="28" height="28" rx="8" fill="none" stroke="#fff" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="7" fill="none" stroke="#fff" strokeWidth="2.5" />
      <circle cx="34.5" cy="13.5" r="2.2" fill="#fff" />
    </svg>
  );
}
