/** Aperçu de l'appli : le fil vidéo vertical, façon TikTok. Purement décoratif. */
export function PhoneMockup() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-[260px] sm:w-[290px]">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gold/25 blur-2xl" />
      <div className="rounded-[2.6rem] bg-ink p-2.5 shadow-2xl">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[2.1rem] bg-gradient-to-b from-[#3b5d50] via-[#6d7f63] to-[#c79a5b]">
          {/* Pièce stylisée : fenêtre, canapé, sol */}
          <div className="absolute left-[14%] top-[16%] h-[24%] w-[42%] rounded-md bg-[#cfe3f0]/70 ring-4 ring-white/40" />
          <div className="absolute left-[8%] right-[8%] top-[52%] h-[11%] rounded-2xl bg-[#e9dcc6]/85" />
          <div className="absolute left-[12%] right-[12%] top-[47%] h-[8%] rounded-t-2xl bg-[#d8c7aa]/90" />
          <div className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black/75 to-transparent" />

          <div className="absolute left-3 right-3 top-3 flex items-center justify-between text-[10px] font-semibold text-white">
            <span className="rounded-full bg-black/30 px-2 py-1">Pour toi · Douala</span>
            <span className="rounded-full bg-black/30 px-2 py-1">≤ 150 000</span>
          </div>

          <div className="absolute bottom-24 right-2 flex flex-col items-center gap-3 text-white">
            {['♥', '★', '↗'].map((icon) => (
              <span key={icon} className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-sm">
                {icon}
              </span>
            ))}
            <span className="rounded-full bg-gold px-2 py-1 text-[9px] font-bold text-ink">Contacter</span>
          </div>

          <div className="absolute bottom-4 left-3 right-14 text-white">
            <div className="flex flex-wrap gap-1">
              <span className="rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold">✓ Vérifié</span>
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[9px] font-semibold">Visite gratuite</span>
            </div>
            <p className="mt-1.5 text-lg font-extrabold leading-tight">120 000 FCFA</p>
            <p className="text-[11px] font-medium text-white/90">Appartement meublé · Bonamoussadi</p>
            <p className="mt-1 text-[10px] text-white/75">Agent : 120 000 + visites · Klé : ton pack + 12 000</p>
          </div>
        </div>
      </div>
    </div>
  );
}
