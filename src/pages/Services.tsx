import { Link } from "react-router-dom";
import { Car, Bike, ShieldCheck, Award, FileCheck, Check } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const services = [
  { icon: Car, title: "GrabCar Registration", desc: "Complete onboarding for new GrabCar drivers — from documents to activation.", benefits: ["Document preparation", "Application submission", "Status tracking"] },
  { icon: ShieldCheck, title: "GrabCar Reactivation", desc: "Bring suspended or inactive accounts back to active driving status.", benefits: ["Eligibility review", "Reactivation request", "Follow-up support"] },
  { icon: Bike, title: "GrabFood Registration", desc: "Become a GrabFood rider with our full-cycle registration support.", benefits: ["Quick onboarding", "Vehicle compliance check", "Account activation"] },
  { icon: Award, title: "PSV Guidance", desc: "Step-by-step coaching to obtain your PSV license successfully.", benefits: ["Course guidance", "Test preparation", "Document handling"] },
  { icon: FileCheck, title: "Document Checking", desc: "We verify all paperwork before submission to avoid rejection.", benefits: ["Detailed checklist", "Format validation", "Error prevention"] },
];

const Services = () => (
  <>
    <PageHero eyebrow="Services" title="Everything you need for GrabCar & GrabFood" subtitle="Pick the service that fits you. We'll guide you the rest of the way." />
    <section className="container py-16 grid lg:grid-cols-2 gap-6">
      {services.map((s) => (
        <Card key={s.title} className="p-7 shadow-card-hover">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <s.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-charcoal">{s.title}</h3>
              <p className="text-sm text-charcoal/65 mt-2">{s.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {s.benefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-charcoal/75">
                    <Check className="w-4 h-4 text-brand" /> {b}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 mt-5">
                <Button asChild size="sm" className="gradient-brand"><Link to="/register">Start Registration</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/guide">View Guide</Link></Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </section>
  </>
);
export default Services;
