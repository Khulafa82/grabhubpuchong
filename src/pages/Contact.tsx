import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const Contact = () => (
  <>
    <PageHero eyebrow="Contact" title="Talk to our team" subtitle="We're here to help with your registration questions." />
    <section className="container py-16 grid lg:grid-cols-3 gap-5">
      {[{ icon: Phone, t: "Call us", d: "+60 — — ——— ——" },
        { icon: Mail, t: "Email", d: "hello@grabhubpuchong.my" },
        { icon: MessageCircle, t: "WhatsApp", d: "Chat anytime" },
        { icon: MapPin, t: "Visit", d: "Puchong, Selangor" }].map((c) => (
        <Card key={c.t} className="p-5 shadow-card-hover">
          <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center"><c.icon className="w-5 h-5" /></div>
          <div className="font-semibold text-charcoal mt-3">{c.t}</div>
          <div className="text-sm text-charcoal/60 mt-1">{c.d}</div>
        </Card>
      ))}
    </section>
    <section className="container pb-16 grid lg:grid-cols-2 gap-6">
      <Card className="p-7">
        <h3 className="text-xl font-bold text-charcoal">Send us a message</h3>
        <div className="mt-5 grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Full name</Label><Input className="mt-1.5" placeholder="Your name" /></div>
            <div><Label>Phone</Label><Input className="mt-1.5" placeholder="+60..." /></div>
          </div>
          <div><Label>Email</Label><Input type="email" className="mt-1.5" placeholder="you@email.com" /></div>
          <div><Label>Message</Label><Textarea className="mt-1.5" rows={5} placeholder="How can we help?" /></div>
          <Button className="gradient-brand">Send Message</Button>
        </div>
      </Card>
      <div className="space-y-5">
        <Card className="p-0 overflow-hidden h-64">
          <div className="w-full h-full bg-surface-muted flex items-center justify-center text-charcoal/40">
            <div className="text-center"><MapPin className="w-8 h-8 mx-auto" /><div className="text-sm mt-2">Map placeholder — Puchong, Selangor</div></div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-bold text-charcoal">FAQ</h3>
          <div className="mt-3 space-y-3">
            {["How long does registration take?", "What documents do I need?", "Can I reactivate my account?"].map((q) => (
              <div key={q} className="text-sm">
                <div className="font-medium text-charcoal">{q}</div>
                <div className="text-charcoal/60 mt-1">Visit our Guide page for full answers.</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  </>
);
export default Contact;
