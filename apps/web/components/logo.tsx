/** Logo Klé : une clé dorée sur fond vert. */
export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0b6e4f" />
      <circle cx="12" cy="13" r="5.2" fill="none" stroke="#f2a007" strokeWidth="2.6" />
      <path d="M15.6 16.6 24 25M20.2 21.2l2.4-2.4M22.6 23.6l2-2" stroke="#f2a007" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-extrabold tracking-tight text-ink">
      <Logo />
      <span className="text-xl">Klé</span>
    </span>
  );
}
