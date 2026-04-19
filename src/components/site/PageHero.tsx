export const PageHero = ({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) => (
  <section className="gradient-hero border-b border-border">
    <div className="container py-16 md:py-20 text-center">
      {eyebrow && <div className="inline-block px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-4">{eyebrow}</div>}
      <h1 className="text-3xl md:text-5xl font-bold text-charcoal max-w-3xl mx-auto leading-tight">{title}</h1>
      {subtitle && <p className="text-base md:text-lg text-charcoal/60 mt-4 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  </section>
);
