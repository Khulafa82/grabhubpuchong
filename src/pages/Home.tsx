import { Link } from "react-router-dom";
import {
  ArrowRight, Check, Car, Bike, FileCheck, ShieldCheck, Users, Clock,
  ClipboardList, UserCheck, Send, MessageCircle, BookOpen, Award, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHomepageContent } from "@/hooks/useHomepageContent";
import { HomepageEditPanel } from "@/components/site/HomepageEditPanel";
import { useHomepageEdit } from "@/context/HomepageEditContext";

const stats = [
  { label: "Applicants Assisted", value: "1,200+", icon: Users },
  { label: "GrabCar & GrabFood", value: "Both", icon: Car },
  { label: "Fast Processing", value: "24h", icon: Clock },
  { label: "Dedicated Staff", value: "100%", icon: ShieldCheck },
];

const services = [
  { icon: Car, title: "GrabCar Registration", desc: "End-to-end onboarding for new GrabCar drivers." },
  { icon: ShieldCheck, title: "GrabCar Reactivation", desc: "Reactivate suspended or inactive driver accounts." },
  { icon: Bike, title: "GrabFood Registration", desc: "Sign up as a GrabFood rider with full guidance." },
  { icon: Award, title: "PSV Guidance", desc: "Step-by-step support to obtain your PSV license." },
  { icon: FileCheck, title: "Document Checking", desc: "We verify your paperwork before submission." },
];

const steps = [
  { icon: ClipboardList, title: "Choose Service" },
  { icon: UserCheck, title: "Check Eligibility" },
  { icon: FileText, title: "Fill Information" },
  { icon: Send, title: "Submit Registration" },
  { icon: MessageCircle, title: "Wait for Contact" },
];

const team = [
  { name: "Aiman", role: "Lead Admin" },
  { name: "Nadia", role: "Customer Support" },
  { name: "Ridzuan", role: "PSV Specialist" },
  { name: "Sara", role: "Reactivation Officer" },
];

const guides = [
  { icon: Award, title: "PSV Guide", desc: "Everything you need to know about the PSV license process." },
  { icon: ShieldCheck, title: "Approval Tips", desc: "Common reasons for rejection and how to avoid them." },
  { icon: FileText, title: "Required Documents", desc: "Checklist of documents for both GrabCar & GrabFood." },
];

const Home = () => {
  const { content, setContent } = useHomepageContent();
  const { editing, close } = useHomepageEdit();
  const { hero, about, cta } = content;

  return (
    <>
      <HomepageEditPanel
        open={editing}
        onOpenChange={(v) => { if (!v) close(); }}
        initial={content}
        onSaved={(next) => setContent(next)}
      />

      {/* HERO */}
      <section className="gradient-hero">
        <div className="container py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              {hero.badge}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-charcoal leading-[1.05] tracking-tight">
              {hero.headline_lead} <span className="text-brand">{hero.headline_accent}</span>
            </h1>
            <p className="text-lg text-charcoal/65 mt-5 max-w-xl">
              {hero.subtitle}
            </p>
            <ul className="mt-6 space-y-2.5">
              {hero.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-charcoal/80">
                  <span className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center"><Check className="w-3 h-3" /></span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button asChild size="lg" className="gradient-brand shadow-brand">
                <Link to={hero.primary_cta_href}>{hero.primary_cta_text} <ArrowRight className="ml-1 w-4 h-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={hero.secondary_cta_href}>{hero.secondary_cta_text}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square max-w-md mx-auto relative">
              <div className="absolute inset-0 gradient-brand rounded-[2.5rem] rotate-6 opacity-20" />
              <Card className="absolute inset-0 rotate-3 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl overflow-hidden">
                {hero.card_image_url ? (
                  <img
                    src={hero.card_image_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                  />
                ) : null}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center shadow-brand">
                    <Car className="w-7 h-7 text-brand-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-charcoal mt-6">{hero.card_title}</h3>
                  <p className="text-sm text-charcoal/60 mt-2">{hero.card_subtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 relative">
                  {[{ l: "Drivers", v: "GrabCar" }, { l: "Riders", v: "GrabFood" }].map((c) => (
                    <div key={c.l} className="bg-surface-muted rounded-xl p-3">
                      <div className="text-[10px] uppercase tracking-wider text-charcoal/50">{c.l}</div>
                      <div className="text-sm font-semibold text-charcoal mt-1">{c.v}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5 shadow-card-hover">
              <s.icon className="w-5 h-5 text-brand" />
              <div className="text-2xl font-bold text-charcoal mt-3">{s.value}</div>
              <div className="text-xs text-charcoal/55 mt-1">{s.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="container py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs font-semibold text-brand uppercase tracking-wider">{about.eyebrow}</div>
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal mt-3">{about.title}</h2>
          {about.image_url && (
            <img
              src={about.image_url}
              alt=""
              className="mt-6 mx-auto rounded-2xl max-h-64 object-cover shadow-card-hover"
            />
          )}
          <p className="text-charcoal/65 mt-4 whitespace-pre-line">
            {about.body}
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to={about.cta_href}>{about.cta_text}</Link>
          </Button>
        </div>
      </section>

      {/* TEAM */}
      <section className="bg-surface-muted">
        <div className="container py-16">
          <div className="text-center mb-10">
            <div className="text-xs font-semibold text-brand uppercase tracking-wider">Our Team</div>
            <h2 className="text-3xl font-bold text-charcoal mt-2">People behind your success</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {team.map((m) => (
              <Card key={m.name} className="p-5 text-center shadow-card-hover">
                <div className="w-16 h-16 rounded-full gradient-brand mx-auto flex items-center justify-center text-brand-foreground font-bold text-xl">
                  {m.name.charAt(0)}
                </div>
                <div className="font-semibold text-charcoal mt-3">{m.name}</div>
                <div className="text-xs text-charcoal/55 mt-1">{m.role}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-brand uppercase tracking-wider">Services</div>
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal mt-2">Everything you need to get started</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <Card key={s.title} className="p-6 shadow-card-hover">
              <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <s.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-charcoal mt-4">{s.title}</h3>
              <p className="text-sm text-charcoal/60 mt-2">{s.desc}</p>
              <div className="flex gap-2 mt-5">
                <Button asChild size="sm" className="gradient-brand"><Link to="/register">Start Now</Link></Button>
                <Button asChild size="sm" variant="ghost"><Link to="/guide">Learn More</Link></Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-charcoal text-charcoal-foreground">
        <div className="container py-20">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-brand uppercase tracking-wider">How it works</div>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">A simple 5-step process</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {steps.map((s, i) => (
              <div key={s.title} className="bg-charcoal-foreground/5 rounded-2xl p-5 border border-charcoal-foreground/10">
                <div className="text-brand text-xs font-bold">STEP {i + 1}</div>
                <s.icon className="w-6 h-6 mt-3 text-brand" />
                <div className="font-semibold mt-3">{s.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GUIDE */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-brand uppercase tracking-wider">Guides</div>
          <h2 className="text-3xl font-bold text-charcoal mt-2">Read before you register</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {guides.map((g) => (
            <Card key={g.title} className="p-6 shadow-card-hover">
              <g.icon className="w-6 h-6 text-brand" />
              <h3 className="font-semibold text-charcoal mt-3">{g.title}</h3>
              <p className="text-sm text-charcoal/60 mt-2">{g.desc}</p>
              <Button asChild variant="link" className="px-0 mt-3 text-brand"><Link to="/guide">Read more <ArrowRight className="w-3 h-3 ml-1" /></Link></Button>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <Card className="p-10 md:p-14 gradient-brand text-brand-foreground text-center rounded-3xl">
          <BookOpen className="w-10 h-10 mx-auto opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold mt-4">{cta.title}</h2>
          <p className="opacity-90 mt-3 max-w-xl mx-auto">{cta.subtitle}</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 bg-background text-charcoal hover:bg-background/90">
            <Link to={cta.button_href}>{cta.button_text} <ArrowRight className="ml-1 w-4 h-4" /></Link>
          </Button>
        </Card>
      </section>
    </>
  );
};

export default Home;
