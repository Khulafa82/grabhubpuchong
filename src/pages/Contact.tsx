import { useRef, useState } from "react";
import { MapPin, Music2, Facebook, MessageCircle, Navigation, Upload, FileText, X, Sparkles } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

// TODO: replace dummy links with real URLs
const SOCIAL_LINKS = {
  tiktok: "https://www.tiktok.com/@grabhubpuchong",
  facebook: "https://www.facebook.com/grabhubpuchong",
  whatsapp: "https://wa.me/60123456789",
  waze: "https://waze.com/ul?ll=3.0319,101.6166&navigate=yes",
  googleMaps: "https://www.google.com/maps/search/?api=1&query=Puchong+Selangor",
};

const socials = [
  {
    key: "tiktok",
    icon: Music2,
    name: "TikTok",
    desc: "Watch updates, behind-the-scenes, and our latest content.",
    cta: "Follow on TikTok",
    href: SOCIAL_LINKS.tiktok,
    accent: "from-pink-500 to-rose-500",
  },
  {
    key: "facebook",
    icon: Facebook,
    name: "Facebook",
    desc: "See announcements, community posts, and team updates.",
    cta: "Follow on Facebook",
    href: SOCIAL_LINKS.facebook,
    accent: "from-blue-600 to-blue-500",
  },
  {
    key: "whatsapp",
    icon: MessageCircle,
    name: "WhatsApp",
    desc: "Chat with us directly for quick help and registration questions.",
    cta: "Open WhatsApp",
    href: SOCIAL_LINKS.whatsapp,
    accent: "from-emerald-500 to-green-500",
  },
] as const;

const faqs = [
  { q: "How long does registration take?", a: "Most registrations are completed within 1–2 working days once all documents are submitted." },
  { q: "What documents do I need?", a: "Bring your IC, driving license, vehicle grant, and a recent passport-size photo. Visit our Guide page for the full list." },
  { q: "Can I reactivate my account?", a: "Yes — drop by our hub or message us on WhatsApp. We'll guide you through the reactivation steps." },
  { q: "How can I apply to work at Grab Hub Puchong?", a: "Use the 'Join Our Team' form on this page. Upload your resume in PDF and we'll be in touch." },
  { q: "How do I contact the team quickly?", a: "WhatsApp is the fastest channel. You can also visit us in Puchong, Selangor during operating hours." },
];

const Contact = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [submitting, setSubmitting] = useState(false);

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Resume must be smaller than 10MB.");
      return;
    }
    setResume(file);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Full name is required.");
    if (!form.phone.trim()) return toast.error("Phone number is required.");
    if (!form.email.trim()) return toast.error("Email is required.");
    if (!resume) return toast.error("Please upload your resume (PDF).");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setForm({ name: "", phone: "", email: "" });
      setResume(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Application submitted! We'll be in touch soon.");
    }, 600);
  };

  return (
    <>
      <PageHero
        eyebrow="Connect"
        title="Let's Connect with Grab Hub Puchong"
        subtitle="Follow us, visit us, or apply to join our team."
      />

      {/* Social media section */}
      <section className="container py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Follow us
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-charcoal">Stay connected with Grab Hub Puchong</h2>
          <p className="text-charcoal/60 mt-2">Follow our latest updates, announcements, and opportunities.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {socials.map((s) => (
            <Card key={s.key} className="p-6 shadow-card-hover relative overflow-hidden group">
              <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${s.accent} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.accent} text-white flex items-center justify-center shadow-lg`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div className="font-bold text-charcoal mt-4 text-lg">{s.name}</div>
              <p className="text-sm text-charcoal/60 mt-1.5 min-h-[40px]">{s.desc}</p>
              <Button asChild className="mt-4 w-full gradient-brand">
                <a href={s.href} target="_blank" rel="noreferrer">{s.cta}</a>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Location section */}
      <section className="container pb-16">
        <Card className="overflow-hidden grid lg:grid-cols-2">
          <div className="p-8 md:p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3">
              <MapPin className="w-3.5 h-3.5" /> Visit us
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-charcoal">Find Grab Hub Puchong</h2>
            <p className="text-charcoal/60 mt-2">Drop by our hub for in-person registration, document verification, and quick help.</p>
            <div className="mt-5 space-y-1 text-charcoal">
              <div className="font-semibold">Grab Hub Puchong</div>
              <div className="text-charcoal/70 text-sm">Puchong, Selangor, Malaysia</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              <Button asChild className="gradient-brand">
                <a href={SOCIAL_LINKS.waze} target="_blank" rel="noreferrer">
                  <Navigation className="w-4 h-4 mr-1" /> Open in Waze
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={SOCIAL_LINKS.googleMaps} target="_blank" rel="noreferrer">
                  <MapPin className="w-4 h-4 mr-1" /> Open in Google Maps
                </a>
              </Button>
            </div>
          </div>
          <div className="bg-gradient-to-br from-brand/10 via-surface-muted to-brand/5 min-h-[260px] flex items-center justify-center relative">
            <div className="text-center text-charcoal/50 px-6">
              <MapPin className="w-10 h-10 mx-auto text-brand/60" />
              <div className="text-sm mt-2 font-medium">Map preview</div>
              <div className="text-xs">Puchong, Selangor</div>
            </div>
          </div>
        </Card>
      </section>

      {/* Join our team + FAQ */}
      <section className="container pb-20 grid lg:grid-cols-5 gap-6">
        <Card className="p-7 lg:col-span-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Careers
          </div>
          <h3 className="text-2xl font-bold text-charcoal">Join Our Team</h3>
          <p className="text-sm text-charcoal/60 mt-1.5">
            Interested in joining Grab Hub Puchong? Submit your details and resume.
          </p>
          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div>
              <Label>Full name</Label>
              <Input className="mt-1.5" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Phone number</Label>
                <Input className="mt-1.5" placeholder="+60..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
              </div>
              <div>
                <Label>Email address</Label>
                <Input type="email" className="mt-1.5" placeholder="you@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
              </div>
            </div>
            <div>
              <Label>Upload Resume (PDF only)</Label>
              <div className="mt-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
                {!resume ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-charcoal/60 hover:border-brand hover:bg-brand/5 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-brand" />
                    <div className="text-sm font-medium text-charcoal">Click to upload your resume</div>
                    <div className="text-xs">PDF only · One file only · Max 10MB</div>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3 border border-border rounded-lg p-3 bg-surface-muted">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-brand/10 text-brand flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-charcoal truncate">{resume.name}</div>
                        <div className="text-xs text-charcoal/60">{(resume.size / 1024).toFixed(0)} KB · PDF</div>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setResume(null); if (fileRef.current) fileRef.current.value = ""; }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-charcoal/50 mt-2">Please upload your resume in PDF format only. One file only.</p>
            </div>
            <Button type="submit" disabled={submitting} className="gradient-brand">
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </Card>

        <Card className="p-7 lg:col-span-2 h-fit">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3">
            FAQ
          </div>
          <h3 className="text-2xl font-bold text-charcoal">Frequently asked</h3>
          <p className="text-sm text-charcoal/60 mt-1.5">Quick answers to common questions.</p>
          <Accordion type="single" collapsible className="mt-4">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm font-semibold text-charcoal">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-charcoal/70">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </section>
    </>
  );
};

export default Contact;
