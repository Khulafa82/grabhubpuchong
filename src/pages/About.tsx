import { Link } from "react-router-dom";
import { Target, Eye, Heart, Award } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const About = () => (
  <>
    <PageHero eyebrow="About Us" title="Helping people start their Grab journey, one applicant at a time" subtitle="Grab Hub Puchong is a dedicated service hub focused on quality, clarity, and human support." />
    <section className="container py-16 grid md:grid-cols-2 gap-10 items-center">
      <div>
        <h2 className="text-3xl font-bold text-charcoal">Who we are</h2>
        <p className="text-charcoal/65 mt-4 leading-relaxed">
          We are a team of dedicated specialists in Puchong who help individuals register, reactivate, and prepare their GrabCar or GrabFood applications. Our hub combines structured processes with friendly support to make every step easy.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[{ icon: Target, t: "Mission", d: "Empower applicants with clarity & speed." },
          { icon: Eye, t: "Vision", d: "The most trusted Grab service hub in Malaysia." },
          { icon: Heart, t: "Values", d: "Honesty, care, and excellence." },
          { icon: Award, t: "Quality", d: "Every application handled with detail." }].map((c) => (
          <Card key={c.t} className="p-5 shadow-card-hover">
            <c.icon className="w-5 h-5 text-brand" />
            <div className="font-semibold text-charcoal mt-3">{c.t}</div>
            <div className="text-xs text-charcoal/60 mt-1">{c.d}</div>
          </Card>
        ))}
      </div>
    </section>
    <section className="bg-surface-muted py-16">
      <div className="container">
        <h2 className="text-3xl font-bold text-charcoal text-center">Why choose us</h2>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {["Experienced team", "Structured process", "Personal guidance", "Fast turnaround", "Honest advice", "Local presence"].map((w) => (
            <Card key={w} className="p-6 shadow-card-hover">
              <div className="w-8 h-8 rounded-lg gradient-brand mb-3" />
              <div className="font-semibold text-charcoal">{w}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
    <section className="container py-16 text-center">
      <h2 className="text-3xl font-bold text-charcoal">Let's get you started</h2>
      <div className="flex justify-center gap-3 mt-6">
        <Button asChild className="gradient-brand"><Link to="/register">Register Now</Link></Button>
        <Button asChild variant="outline"><Link to="/staff-login">Staff Login</Link></Button>
      </div>
    </section>
  </>
);
export default About;
